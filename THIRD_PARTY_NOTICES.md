# Third-Party Notices & Open-Source Attributions

OppHub references, adapts, and builds upon several incredible open-source projects. In accordance with open-source licensing principles, this document lists all referenced projects, their authors, and licenses.

---

### 1. ATS Resume Checker (`hugounoclaw/ats-checker`)
- **Repository:** https://github.com/hugounoclaw/ats-checker
- **License:** MIT License
- **Author:** Hugo Unoclaw and contributors
- **Usage in OppHub:** Client-side parsing and scoring algorithms (keyword density, action-verb detection, quant impact checks) ported directly to TypeScript.

---

### 2. Resume Matcher (`srbhr/Resume-Matcher`)
- **Repository:** https://github.com/srbhr/Resume-Matcher
- **License:** Apache License 2.0
- **Author:** Saurabh Rai and contributors
- **Usage in OppHub:** Conceptual approach for parsing, extracting key terms, and matching resumes against job descriptions, adapted to lightweight LLM prompts and embeddings.

---

### 3. Hackathon API (`0xarchit/hackathon-api`)
- **Repository:** https://github.com/0xarchit/hackathon-api
- **License:** MIT License
- **Author:** Archit Sharma (`0xarchit`) and contributors
- **Usage in OppHub:** Multi-platform hackathon aggregator patterns and platform endpoints adapted for scheduled ingestion scripts.

---

### 4. SimplifyJobs Internship Listings (`SimplifyJobs/Summer2026-Internships` & `Summer2027-Internships`)
- **Repository:** https://github.com/SimplifyJobs/Summer2026-Internships
- **Authors:** Simplify (https://simplify.jobs) and Pitt Computer Science Club (https://pittcsc.org)
- **License / Status:** Public community-maintained data source (No formal license file in repository).
- **Usage in OppHub:** Used solely as an open public data feed for internship opportunities. OppHub parses the public README tables and directs applicants to the original posting links.

---

### 5. JSON Resume Schema
- **Project:** https://jsonresume.org
- **License:** MIT License
- **Usage in OppHub:** Canonical schema standard for structured resume data in `resume_versions`.
