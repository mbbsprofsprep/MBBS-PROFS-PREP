// ============================================================================
// js/subject-registry.js
// Single Source of Truth: Institutes, Prof Years, 19 Subjects & URL Routing
// ============================================================================

export const INSTITUTES = [
    { id: "delhi",       name: "AIIMS Delhi",       city: "New Delhi",       badge: "D", locked: false, visible: true  },
    { id: "deoghar",     name: "AIIMS Deoghar",     city: "Jharkhand",       badge: "D", locked: false, visible: true  },
    { id: "kalyani",     name: "AIIMS Kalyani",     city: "West Bengal",     badge: "K", locked: false, visible: true  },
    { id: "bhubaneswar", name: "AIIMS Bhubaneswar", city: "Odisha",          badge: "B", locked: false, visible: false },
    { id: "bhopal",      name: "AIIMS Bhopal",      city: "Madhya Pradesh",  badge: "B", locked: false, visible: false },
    { id: "jodhpur",     name: "AIIMS Jodhpur",     city: "Rajasthan",       badge: "J", locked: false, visible: false },
    { id: "patna",       name: "AIIMS Patna",       city: "Bihar",           badge: "P", locked: false, visible: false },
    { id: "raipur",      name: "AIIMS Raipur",      city: "Chhattisgarh",    badge: "R", locked: false, visible: false },
    { id: "rishikesh",   name: "AIIMS Rishikesh",   city: "Uttarakhand",     badge: "R", locked: false, visible: false },
    { id: "mangalagiri", name: "AIIMS Mangalagiri", city: "Andhra Pradesh",  badge: "M", locked: false, visible: false },
    { id: "nagpur",      name: "AIIMS Nagpur",      city: "Maharashtra",     badge: "N", locked: false, visible: false },
    { id: "gorakhpur",   name: "AIIMS Gorakhpur",   city: "Uttar Pradesh",   badge: "G", locked: false, visible: false },
    { id: "bathinda",    name: "AIIMS Bathinda",    city: "Punjab",          badge: "B", locked: false, visible: false },
    { id: "guwahati",    name: "AIIMS Guwahati",    city: "Assam",           badge: "G", locked: false, visible: false },
    { id: "vijayawada",  name: "AIIMS Vijayawada",  city: "Andhra Pradesh",  badge: "V", locked: false, visible: false },
    { id: "bilaspur",    name: "AIIMS Bilaspur",    city: "Himachal Pradesh",badge: "B", locked: false, visible: false },
    { id: "madurai",     name: "AIIMS Madurai",     city: "Tamil Nadu",      badge: "M", locked: false, visible: false },
    { id: "darbhanga",   name: "AIIMS Darbhanga",   city: "Bihar",           badge: "D", locked: false, visible: false },
    { id: "awantipora",  name: "AIIMS Awantipora",  city: "Kashmir",         badge: "A", locked: false, visible: false },
    { id: "rajkot",      name: "AIIMS Rajkot",      city: "Gujarat",         badge: "R", locked: false, visible: false },
    { id: "bibinagar",   name: "AIIMS Bibinagar",   city: "Telangana",       badge: "B", locked: false, visible: false },
    { id: "raebareli",   name: "AIIMS Raebareli",   city: "Uttar Pradesh",   badge: "R", locked: false, visible: false }
];

export const YEARS = [
    { id: "1", name: "First Prof",  sub: "Anatomy • Physio • Biochem" },
    { id: "2", name: "Second Prof", sub: "Patho • Pharma • Micro • FMT" },
    { id: "3", name: "Third Prof",  sub: "ENT • Ophthal • PSM • Psych • Ortho" },
    { id: "4", name: "Final Prof",  sub: "Med • Surg • OBG • Peds • Derma • Anesth • Radio" }
];

export const SUBJECTS_BY_YEAR = {
    "1": [
        { id: "anatomy",       name: "Anatomy",            icon: "🦴" },
        { id: "physiology",    name: "Physiology",         icon: "🧠" },
        { id: "biochemistry",  name: "Biochemistry",       icon: "🧪" }
    ],
    "2": [
        { id: "pathology",     name: "Pathology",          icon: "🔬" },
        { id: "pharmacology",  name: "Pharmacology",       icon: "💊" },
        { id: "microbiology",  name: "Microbiology",       icon: "🦠" },
        { id: "fmt",           name: "Forensic Medicine",  icon: "⚖️" }
    ],
    "3": [
        { id: "ent",           name: "ENT",                icon: "👂" },
        { id: "ophthalmology", name: "Ophthalmology",      icon: "👁️" },
        { id: "psm",           name: "Community Medicine", icon: "🏘️" },
        { id: "psychiatry",    name: "Psychiatry",         icon: "🧠" },
        { id: "orthopaedics",  name: "Orthopaedics",       icon: "🦴" }
    ],
    "4": [
        { id: "medicine",      name: "Medicine",           icon: "🩺" },
        { id: "surgery",       name: "Surgery",            icon: "🔪" },
        { id: "obg",           name: "Obs & Gynae",        icon: "👶" },
        { id: "paediatrics",   name: "Paediatrics",        icon: "🧸" },
        { id: "dermatology",   name: "Dermatology",        icon: "🧴" },
        { id: "anaesthesia",   name: "Anaesthesia",        icon: "💉" },
        { id: "radiology",     name: "Radiology",          icon: "🩻" }
    ]
};

// Maps URL slugs to existing Firebase RTDB keys, MedPYQ bridge slugs & legacy JSON prefixes
export const SUBJECT_REGISTRY = {
    anatomy:       { code: "ANATOMY",      name: "Anatomy",            bridgeSlug: "anatomy",       aliases: ["ANATOMY", "anatomy", "ANAT", "anat"] },
    physiology:    { code: "PHYSIOLOGY",   name: "Physiology",         bridgeSlug: "physiology",    aliases: ["PHYSIOLOGY", "physiology", "PHYSIO", "physio"] },
    biochemistry:  { code: "BIOCHEMISTRY", name: "Biochemistry",       bridgeSlug: "biochemistry",  aliases: ["BIOCHEMISTRY", "biochemistry", "BIOCHEM", "biochem"] },
    pathology:     { code: "PATHOLOGY",    name: "Pathology",          bridgeSlug: "pathology",     aliases: ["PATHOLOGY", "pathology", "PATHO", "patho"] },
    pharmacology:  { code: "PHARMACOLOGY", name: "Pharmacology",       bridgeSlug: "pharmacology",  aliases: ["PHARMACOLOGY", "pharmacology", "PHARMA", "pharma"] },
    microbiology:  { code: "MICROBIOLOGY", name: "Microbiology",       bridgeSlug: "microbiology",  aliases: ["MICROBIOLOGY", "microbiology", "MICRO", "micro"] },
    fmt:           { code: "FMT",          name: "Forensic Medicine",  bridgeSlug: "fmt",           aliases: ["FMT", "fmt", "FORENSIC", "forensic"] },
    ent:           { code: "ENT",          name: "ENT",                bridgeSlug: "ent",           aliases: ["ENT", "ent"] },
    ophthalmology: { code: "OPHTHAL",      name: "Ophthalmology",      bridgeSlug: "ophthalmology", aliases: ["OPHTHAL", "ophthal", "OPHTHALMOLOGY", "ophthalmology"] },
    ophthal:       { code: "OPHTHAL",      name: "Ophthalmology",      bridgeSlug: "ophthalmology", aliases: ["OPHTHAL", "ophthal", "OPHTHALMOLOGY", "ophthalmology"] },
    psm:           { code: "CFM",          name: "Community Medicine", bridgeSlug: "cfm",           aliases: ["CFM", "cfm", "PSM", "psm"] },
    cfm:           { code: "CFM",          name: "Community Medicine", bridgeSlug: "cfm",           aliases: ["CFM", "cfm", "PSM", "psm"] },
    psychiatry:    { code: "PSYCHIATRY",   name: "Psychiatry",         bridgeSlug: "psychiatry",    aliases: ["PSYCHIATRY", "psychiatry", "PSYCH", "psych"] },
    orthopaedics:  { code: "ORTHOPAEDICS", name: "Orthopaedics",       bridgeSlug: "orthopaedics",  aliases: ["ORTHOPAEDICS", "orthopaedics", "ORTHO", "ortho"] },
    medicine:      { code: "MEDICINE",     name: "Medicine",           bridgeSlug: "medicine",      aliases: ["MEDICINE", "medicine", "MED", "med"] },
    surgery:       { code: "SURGERY",      name: "Surgery",            bridgeSlug: "surgery",       aliases: ["SURGERY", "surgery", "SURG", "surg"] },
    obg:           { code: "OBG",          name: "Obs & Gynae",        bridgeSlug: "obg",           aliases: ["OBG", "obg"] },
    paediatrics:   { code: "PAEDIATRICS",  name: "Paediatrics",        bridgeSlug: "paediatrics",   aliases: ["PAEDIATRICS", "paediatrics", "PEDIATRICS", "pediatrics", "PEDS", "peds"] },
    dermatology:   { code: "DERMATOLOGY",  name: "Dermatology",        bridgeSlug: "dermatology",   aliases: ["DERMATOLOGY", "dermatology", "DERMA", "derma"] },
    anaesthesia:   { code: "ANAESTHESIA",  name: "Anaesthesia",        bridgeSlug: "anaesthesia",   aliases: ["ANAESTHESIA", "anaesthesia", "ANESTHESIA", "anesthesia"] },
    radiology:     { code: "RADIOLOGY",    name: "Radiology",          bridgeSlug: "radiology",     aliases: ["RADIOLOGY", "radiology", "RADIO", "radio"] }
};

// Default versions used until Admin customizes a subject in portal_config/subject_versions
export const DEFAULT_SUBJECT_VERSIONS = {
    deoghar: {
        "2": {
            microbiology: [
                { label: "Standard Chapterwise PYQ", versionCode: "", visible: true },
                { label: "Chapterwise PYQ (Marrow Ed 8)", versionCode: "ed8", visible: true }
            ],
            pathology: [
                { label: "Standard Chapterwise PYQ", versionCode: "", visible: true },
                { label: "Chapterwise PYQ (Marrow Ed 8)", versionCode: "ed8", visible: true }
            ]
        }
    }
};

export function resolveSubjectMeta(rawInput) {
    const slug = String(rawInput || "cfm").toLowerCase().trim();
    if (SUBJECT_REGISTRY[slug]) return { slug, ...SUBJECT_REGISTRY[slug] };
    const clean = slug.toUpperCase().replace(/[^A-Z0-9_]/g, "") || "CFM";
    return { slug, code: clean, name: clean, bridgeSlug: slug, aliases: [clean, slug] };
}

export function resolveCollegeName(collegeCode) {
    const code = String(collegeCode || "deoghar").toLowerCase().trim();
    const match = INSTITUTES.find(i => i.id === code);
    return match ? match.name : "AIIMS " + code.replace(/-/g, " ").toUpperCase();
}

export function buildReviewUrl(subjectSlug, collegeId, versionCode = "") {
    const params = new URLSearchParams({ college: collegeId, subject: subjectSlug });
    if (versionCode) params.set("version", versionCode);
    return `review.html?${params.toString()}`;
}

export function buildClinicalUrl(subjectSlug, collegeId) {
    const params = new URLSearchParams({ college: collegeId, subject: subjectSlug });
    return `clinical.html?${params.toString()}`;
}

// Automatically converts legacy bookmarked URLs (e.g. pathology-review.html?college=deoghar)
export function normalizeLegacyUrl(url) {
    if (!url || url === "#") return "#";
    const m = String(url).match(/([^\/]+)-(review|clinical)\.html(?:\?(.*))?$/i);
    if (!m) return url;
    const [, rawSub, mode, qs] = m;
    const params = new URLSearchParams(qs || "");
    if (!params.has("subject")) params.set("subject", rawSub.toLowerCase());
    return `${mode.toLowerCase()}.html?${params.toString()}`;
}
