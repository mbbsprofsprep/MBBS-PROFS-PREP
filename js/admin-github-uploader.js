// ============================================================================
// js/admin-github-uploader.js
// Admin-Only Media Engine:
// 1. GitHub Assets Uploader (WebP Compression + Sequential Commit Queue)
// 2. Wikimedia Commons Medical Image / Audio / Video Search
// 3. Optional Mirror-to-GitHub for Permanent Hosting
// ============================================================================
import { db, MPPStore, isUserAdmin, ref, get, set } from "./core-firebase.js";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // Safe cap under GitHub Contents API 25MB limit

const DEFAULT_GH_CONFIG = {
    owner: "mbbsprofsprep",
    repo: "MBBS-PROFS-PREP",
    branch: "main",
    folder: "assets",
    urlMode: "raw", // "raw" (instant) | "jsdelivr" (CDN) | "pages" (GitHub Pages)
    token: ""
};

// Sequential queue prevents GitHub 409 Conflict when uploading multiple files
let commitQueue = Promise.resolve();

function requireAdmin() {
    if (!isUserAdmin()) throw new Error("Admin access strictly required.");
}

// ============================================================================
// 1. GITHUB CONFIG STORAGE (3-Admin-Only node: admin_private/github_config)
// ============================================================================
export async function getGitHubAssetConfig() {
    requireAdmin();
    const snap = await get(ref(db, "admin_private/github_config")).catch(() => null);
    if (snap && snap.exists()) {
        return { ...DEFAULT_GH_CONFIG, ...snap.val() };
    }
    return { ...DEFAULT_GH_CONFIG };
}

export async function saveGitHubAssetConfig({ owner, repo, branch, folder, urlMode, token }) {
    requireAdmin();
    const cleanFolder = String(folder || "assets").trim().replace(/^\/+|\/+$/g, "") || "assets";
    const payload = {
        owner: String(owner || "").trim(),
        repo: String(repo || "").trim(),
        branch: String(branch || "main").trim() || "main",
        folder: cleanFolder,
        urlMode: ["raw", "jsdelivr", "pages"].includes(urlMode) ? urlMode : "raw",
        token: String(token || "").trim(),
        updatedAt: Date.now(),
        updatedBy: MPPStore.user?.email || "admin"
    };
    if (!payload.owner || !payload.repo || !payload.token) {
        throw new Error("Owner, Repository name, and Fine-Grained Token are required.");
    }
    await set(ref(db, "admin_private/github_config"), payload);
    return payload;
}

export async function testGitHubConnection(cfgOverride = null) {
    requireAdmin();
    const cfg = cfgOverride || await getGitHubAssetConfig();
    if (!cfg.owner || !cfg.repo || !cfg.token) {
        throw new Error("Missing GitHub Owner, Repo, or Token.");
    }

    const res = await fetch(`https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}`, {
        headers: {
            "Authorization": `Bearer ${cfg.token}`,
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28"
        }
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub HTTP ${res.status}`);
    }

    const data = await res.json();
    if (data.private) {
        return { ok: true, warning: "Repo is PRIVATE — students won't be able to view public asset URLs unless the repo is Public.", defaultBranch: data.default_branch };
    }
    if (data.permissions && data.permissions.push === false) {
        throw new Error("Token can read the repo, but lacks 'Contents: Read and write' permission.");
    }
    return { ok: true, warning: "", defaultBranch: data.default_branch };
}

// ============================================================================
// 2. CLIENT-SIDE WEBP COMPRESSION & CHUNK-SAFE BASE64 CONVERTER
// ============================================================================
async function compressImageIfNeeded(file) {
    const type = String(file.type || "").toLowerCase();
    if (!type.startsWith("image/") || type === "image/gif" || type === "image/svg+xml") {
        return file;
    }

    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const MAX_DIM = 1600;
                let { width, height } = img;
                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height = Math.round((height * MAX_DIM) / width);
                        width = MAX_DIM;
                    } else {
                        width = Math.round((width * MAX_DIM) / height);
                        height = MAX_DIM;
                    }
                }
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                canvas.getContext("2d").drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return resolve(file);
                    const ext = blob.type === "image/webp" ? "webp" : "jpg";
                    const base = String(file.name || "image").replace(/\.[^.]+$/, "");
                    resolve(new File([blob], `${base}.${ext}`, { type: blob.type }));
                }, "image/webp", 0.82);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = String(reader.result || "");
            const idx = result.indexOf(",");
            resolve(idx !== -1 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(new Error("Failed to encode file to Base64."));
        reader.readAsDataURL(blob);
    });
}

function buildPublicAssetUrl(cfg, repoPath) {
    const encodedPath = repoPath.split("/").map(encodeURIComponent).join("/");
    if (cfg.urlMode === "jsdelivr") {
        return `https://cdn.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${cfg.branch}/${encodedPath}`;
    }
    if (cfg.urlMode === "pages") {
        return `https://${cfg.owner}.github.io/${cfg.repo}/${encodedPath}`;
    }
    // Default "raw": instant 0-second availability in Live Student Preview
    return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${encodedPath}`;
}

function sanitizeSlug(str, fallback = "general") {
    return String(str || fallback).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;
}

// ============================================================================
// 3. GITHUB CONTENTS API UPLOADER (With Progress & Sequential Queue)
// ============================================================================
function putFileToGitHubAPI(cfg, repoPath, base64Content, commitMsg, onProgress) {
    return new Promise((resolve, reject) => {
        const encodedPath = repoPath.split("/").map(encodeURIComponent).join("/");
        const apiUrl = `https://api.github.com/repos/${encodeURIComponent(cfg.owner)}/${encodeURIComponent(cfg.repo)}/contents/${encodedPath}`;

        const xhr = new XMLHttpRequest();
        xhr.open("PUT", apiUrl, true);
        xhr.setRequestHeader("Authorization", `Bearer ${cfg.token}`);
        xhr.setRequestHeader("Accept", "application/vnd.github+json");
        xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
        xhr.setRequestHeader("Content-Type", "application/json");

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && typeof onProgress === "function") {
                onProgress(Math.min(95, Math.round((e.loaded / e.total) * 95)));
            }
        };

        xhr.onload = () => {
            let body = {};
            try { body = JSON.parse(xhr.responseText || "{}"); } catch (_) {}

            if (xhr.status >= 200 && xhr.status < 300) {
                if (typeof onProgress === "function") onProgress(100);
                resolve({
                    url: buildPublicAssetUrl(cfg, repoPath),
                    pagesUrl: `https://${cfg.owner}.github.io/${cfg.repo}/${encodedPath}`,
                    rawUrl: `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${encodedPath}`,
                    repoPath,
                    sha: body.content?.sha || ""
                });
            } else {
                const detail = body.message || `GitHub API error (${xhr.status})`;
                reject(new Error(detail));
            }
        };

        xhr.onerror = () => reject(new Error("Network error while uploading to GitHub."));

        xhr.send(JSON.stringify({
            message: commitMsg,
            content: base64Content,
            branch: cfg.branch
        }));
    });
}

export function uploadFileToGitHub(rawFile, { college, subject, onProgress } = {}) {
    requireAdmin();

    // Chain into sequential commitQueue so multi-file uploads never hit 409 Conflict
    const job = commitQueue.then(async () => {
        if (!rawFile) throw new Error("No file provided.");
        if (rawFile.size > MAX_FILE_BYTES) {
            throw new Error(`"${rawFile.name}" is larger than 20 MB. Compress it first or link via Google Drive/YouTube.`);
        }

        const cfg = await getGitHubAssetConfig();
        if (!cfg.token) {
            throw new Error("GitHub Token not configured yet. Open '⚙️ GitHub Asset Settings' inside the Upload tab.");
        }

        if (typeof onProgress === "function") onProgress(5);
        const processedFile = await compressImageIfNeeded(rawFile);
        const base64 = await blobToBase64(processedFile);

        const colDir = sanitizeSlug(college || MPPStore.page.collegeCode || "deoghar");
        const subDir = sanitizeSlug(subject || MPPStore.page.subjectSlug || MPPStore.page.subjectCode || "general");
        const cleanFile = String(processedFile.name || "asset.webp").replace(/[^a-zA-Z0-9._-]+/g, "_");
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const repoPath = `${cfg.folder}/${colDir}/${subDir}/${uniquePrefix}_${cleanFile}`;
        const commitMsg = `assets(${subDir}): upload ${cleanFile}`;

        const result = await putFileToGitHubAPI(cfg, repoPath, base64, commitMsg, onProgress);
        return {
            ...result,
            name: processedFile.name,
            type: processedFile.type,
            sizeKB: Math.round(processedFile.size / 1024)
        };
    });

    // Keep queue alive even if one file fails
    commitQueue = job.catch(() => {});
    return job;
}

// Re-hosts an external image (e.g. from Wikimedia Search) permanently into GitHub Assets
export async function mirrorImageUrlToGitHub(imageUrl, labelHint = "medical-image", onProgress = null) {
    requireAdmin();
    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error(`Could not fetch external image (${res.status}).`);
    const blob = await res.blob();
    const ext = (blob.type.split("/")[1] || "jpg").replace(/[^a-z0-9]/gi, "") || "jpg";
    const safeHint = sanitizeSlug(labelHint, "image").slice(0, 40);
    const file = new File([blob], `${safeHint}.${ext}`, { type: blob.type || "image/jpeg" });
    return uploadFileToGitHub(file, { onProgress });
}

// ============================================================================
// 4. WIKIMEDIA COMMONS MEDICAL MEDIA SEARCH (Free, CORS-Safe, No API Key)
// Supports Image, Audio & Video queries (e.g., "Wessely ring", "heart murmur")
// ============================================================================
export async function searchWikimediaMedia(query, { limit = 10, mediaType = "image" } = {}) {
    requireAdmin();
    const q = String(query || "").trim();
    if (!q) return [];

    const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 25);
    // Append filetype hint for audio/video queries so Wikimedia returns playable files
    const searchTerm = mediaType === "audio"
        ? `${q} filetype:audio`
        : mediaType === "video"
            ? `${q} filetype:video`
            : q;

    const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrlimit=${Math.min(safeLimit + 8, 35)}&gsrsearch=${encodeURIComponent(searchTerm)}&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=640&format=json&origin=*`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Wikimedia search failed (HTTP ${res.status}).`);

    const json = await res.json();
    const pages = Object.values(json?.query?.pages || {});

    const allowedPrefix = mediaType === "audio" ? "audio/" : mediaType === "video" ? "video/" : "image/";

    return pages
        .map(p => {
            const info = p.imageinfo?.[0];
            if (!info || !String(info.mime || "").startsWith(allowedPrefix)) return null;
            // Skip tiny icons or raw TIFFs that browsers can't display natively
            if (mediaType === "image" && /tiff|pdf|xcf/i.test(info.mime)) return null;
            return {
                title: String(p.title || "").replace(/^File:/i, ""),
                mime: info.mime,
                thumb: info.thumburl || info.url,
                full: mediaType === "image" ? (info.thumburl || info.url) : info.url,
                originalUrl: info.url
            };
        })
        .filter(Boolean)
        .slice(0, safeLimit);
}
