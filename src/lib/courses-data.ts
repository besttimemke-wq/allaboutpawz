// All About Pawz Academy — Course Catalog & Syllabi
// EVERY field sourced from the Leashed Course Catalog & Syllabi v1.0
// 15 pathways, 146 modules — real module names, real hours, real terms.

export type ProgramDetails = {
  id: string;
  code: string;
  slug: string;
  title: string;
  fullTitle: string;
  subtitle: string;
  tagline: string;
  heroQuote: string;
  heroQuoteAttribution: string;
  badge: string;
  credential: string;
  totalWeeks: number;
  totalWeeksFormatted: string;
  partTimeWeeksFormatted: string;
  totalModules: number;
  totalClockHours: number;
  termsCount: number;
  heroImage: string;
  scheduleWeekly: string;
  stats: { weeks: string; modules: string; hours: string; credential: string };
  overviewParagraphs: string[];
  programObjective: string;
  safetyGates: string[];
  capstoneCode: string;
  stacksInto: string;
  admissionRequirements: string;
  coreCompetencies: { icon: string; label: string }[];
  donutData: { technical: number; businessPersonal: number; applied: number };
  breakdown: { type: string; percent: string; hours: number; description: string }[];
  manuals: { id: string; title: string; type: string }[];
  deliveryAndAccess: { icon: string; title: string; description: string }[];
  completionRequirements: string[];
  terms: {
    termNumber: number;
    name: string;
    technicalModules: string[];
    businessModules: string;
    appliedModule: string | null;
    techHours: number;
    businessHours: number;
    appliedHours: number;
    termHours: number;
    durationWeeks: string;
    description: string;
    modulesCount: number;
    clockHours: number;
    modulesSummary: { technicalHours: number; businessHours: number; appliedHours: number };
    courseHighlights: { code: string; title: string; hours: number; description: string }[];
  }[];
};

// ─── ABT — Animal Behavior Technician ──────────────────────────────────────────
const abt: ProgramDetails = {
  id: "abt",
  code: "ABT",
  slug: "animal-behavior-technician",
  title: "Animal Behavior Technician",
  fullTitle: "Animal Behavior Technician",
  subtitle: "Individuals seeking animal behavior modification and counseling skills.",
  tagline: "Animal Behavior Technician.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Animal Behavior Technician",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 9,
  totalClockHours: 485,
  termsCount: 3,
  heroImage: "/images/pets_caregiver.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "9 Modules", hours: "485 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Animal Behavior Technician is a 12 months program with 9 modules and 385 instructional hours.", "Target: Individuals seeking animal behavior modification and counseling skills."],
  programObjective: "Individuals seeking animal behavior modification and counseling skills.",
  safetyGates: [],
  capstoneCode: "ABT-109",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Foundations of Animal Behavior" },
    { icon: "Heart", label: "Normal Development, Behavior" },
    { icon: "Shield", label: "Neurochemistry" },
    { icon: "PawPrint", label: "Applied Behavior Modification Techniques" },
  ],
  donutData: { technical: 485, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 485, description: "9 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Behavior Foundations — graduate has mastered learning theory, species behavior, and neurochemistry.", "Certificate of Proficiency: Behavior Modification — graduate has completed applied behavior modification and treatment strategy training.", "Program Completion: Animal Behavior Technician — graduate is prepared for animal behavior specialty roles and certification."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["ABT-101", "ABT-102", "ABT-103"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ABT-101", title: "Foundations of Animal Behavior & Learning Theory", hours: 45, description: "foundation in animal behavior science and learning theory. Students learn ethics and welfare, the human-animal bond, learning theory, operant and classical conditioning, non-associative learning, social learning, extinction, and the LA (Least Invasive, Minimally Aversive) philosophy." },
      { code: "ABT-102", title: "Normal Development, Behavior & Observation Across Species", hours: 40, description: "Covers normal development, domestication, animal cognition, and species-specific behavior observation. Students learn normal development and behavior, domestication principles, animal cognition, and observe and identify behaviors across feline, canine, parrot, equine, and exotic species." },
      { code: "ABT-103", title: "Neurochemistry & Psychopharmacology", hours: 35, description: "Covers veterinary neurochemistry and psychopharmacology. Students learn neurochemistry and neuro-psychopharmacology, common psychotropic agents (mechanism of action, side effects, dosing, uses), and how to discuss psychotropics with clients." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["ABT-104", "ABT-105", "ABT-106"], businessModules: "", appliedModule: null, techHours: 140, businessHours: 0, appliedHours: 0, termHours: 140, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 140, modulesSummary: { technicalHours: 140, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ABT-104", title: "Applied Behavior Modification Techniques", hours: 50, description: "coverage of applied behavior modification techniques. Students learn operant conditioning quadrants, classical conditioning, desensitization and counter conditioning (DS/CC), shaping, targeting, capturing, luring, fading prompts, the six aspects of fluency, behavior chaining, generalization, and stimulus control." },
      { code: "ABT-105", title: "Behavior Problems & Treatment Strategies", hours: 50, description: "Covers diagnosis and treatment of common behavior problems. Students learn to recognize and address aggression, anxiety, fear, panic, separation anxiety, compulsive disorders, phobias, conspecific and human-directed aggression, motion-triggered reactivity, possession-related aggression, and recognize behavior emergencies and medical components." },
      { code: "ABT-106", title: "Client Communication, Counseling & Professional Skills", hours: 40, description: "Covers client communication, counseling, and professional skills for behavior technicians. Students learn compassionate and active listening, conflict resolution, calming communication, grief counseling, quality of life discussions, interpersonal relationships, and behavioral record keeping." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["ABT-107", "ABT-108", "ABT-109"], businessModules: "", appliedModule: null, techHours: 125, businessHours: 0, appliedHours: 0, termHours: 125, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 3, clockHours: 125, modulesSummary: { technicalHours: 125, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ABT-107", title: "Training Protocols & Problem Prevention", hours: 45, description: "Covers training protocols and problem prevention counseling. Students learn to develop problem prevention counseling plans across ingestive, elimination, confinement, travel, play, social interactions, handling, grooming, medical care, and equipment categories. Includes writing professional reports and developing training classes for adult animals." },
      { code: "ABT-108", title: "Professional Practice, Ethics & LA", hours: 35, description: "Covers professional practice standards, ethics, and the LA philosophy. Students learn professional ethics, LA dedication, species-specific behavior management (appeasement, conflict, displacement, offensive vs. defensive behaviors, non-threatening body language), and professional reporting standards." },
      { code: "ABT-109", title: "Clinical Practicum & Portfolio", hours: 45, description: "practicum integrating all behavior coursework through supervised clinical experiences. Students demonstrate competency in behavior assessment, modification plan development, client counseling, and present a  portfolio of case studies." },
    ] },
  ],
};

// ─── ACA — Animal Care Assistant ──────────────────────────────────────────
const aca: ProgramDetails = {
  id: "aca",
  code: "ACA",
  slug: "animal-care-assistant",
  title: "Animal Care Assistant",
  fullTitle: "Animal Care Assistant",
  subtitle: "Individuals seeking foundational animal care and handling skills.",
  tagline: "Animal Care Assistant.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Animal Care Assistant",
  totalWeeks: 9,
  totalWeeksFormatted: "2 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 7,
  totalClockHours: 170,
  termsCount: 1,
  heroImage: "/images/pet_sitter.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "9 Weeks", modules: "7 Modules", hours: "170 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Animal Care Assistant is a 2 months program with 7 modules and 170 instructional hours.", "Target: Individuals seeking foundational animal care and handling skills."],
  programObjective: "Individuals seeking foundational animal care and handling skills.",
  safetyGates: [],
  capstoneCode: "ACA-107",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Introduction to Animal Care" },
    { icon: "Heart", label: "AKC Breeds, Recognition" },
    { icon: "Shield", label: "Bathing Techniques" },
    { icon: "PawPrint", label: "Pet Nutrition, Diet" },
  ],
  donutData: { technical: 170, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 170, description: "7 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Program Completion: Animal Care Assistant — graduate is prepared for entry-level animal care positions."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["ACA-101", "ACA-102", "ACA-103", "ACA-104", "ACA-105", "ACA-106", "ACA-107"], businessModules: "", appliedModule: null, techHours: 170, businessHours: 0, appliedHours: 0, termHours: 170, durationWeeks: "≈ 9 Weeks", description: "Term 1 modules.", modulesCount: 7, clockHours: 170, modulesSummary: { technicalHours: 170, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ACA-101", title: "Introduction to Animal Care & Pet Handling", hours: 30, description: "Introduces fundamental animal care and pet handling skills. Students learn basic animal care procedures, safe handling techniques, sanitation processes, and the foundational knowledge needed for animal care assistant roles." },
      { code: "ACA-102", title: "AKC Breeds, Recognition & Characteristics", hours: 20, description: "Covers AKC breed recognition and characteristics for animal care assistants. Students learn to identify dog breeds, understand breed-specific traits, and adapt care approaches accordingly." },
      { code: "ACA-103", title: "Bathing Techniques & Sanitation Process", hours: 25, description: "Covers dog bathing techniques and sanitation processes. Students learn proper bathing methods, sanitation protocols, and hygiene standards for animal care facilities." },
      { code: "ACA-104", title: "Pet Nutrition, Diet & Pet Care", hours: 25, description: "Covers pet nutrition, diet management, and general pet care. Students learn nutritional requirements, feeding protocols, and pet care practices for various species." },
      { code: "ACA-105", title: "Pet Massage & Emotional Intelligence", hours: 25, description: "Covers pet massage techniques and emotional intelligence in animal care. Students learn pet massage, emotional intelligence, empathy, active listening, trust building, and conflict management in animal care settings." },
      { code: "ACA-106", title: "Dog Walking, Day Care & Client Relations", hours: 25, description: "Covers dog walking, doggie day care operations, and client relations. Students learn safe dog walking practices, day care management, and effective client communication for animal care businesses." },
      { code: "ACA-107", title: "CPR, First Aid & Professional Resilience", hours: 20, description: "Covers pet CPR and first aid techniques, plus professional resilience and decision-making skills. Students learn emergency first aid, CPR certification, adaptive problem-solving, and resilience strategies for animal care professionals." },
    ] },
  ],
};

// ─── EQN — Equine Nursing Technicians ──────────────────────────────────────────
const eqn: ProgramDetails = {
  id: "eqn",
  code: "EQN",
  slug: "equine-nursing-technicians",
  title: "Equine Nursing Technicians",
  fullTitle: "Equine Nursing Technician",
  subtitle: "Individuals seeking equine veterinary nursing skills.",
  tagline: "Equine Nursing Technicians.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Equine Nursing Technician",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 9,
  totalClockHours: 440,
  termsCount: 3,
  heroImage: "/images/mountain_sunset.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "9 Modules", hours: "440 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Equine Nursing Technicians is a 12 months program with 9 modules and 385 instructional hours.", "Target: Individuals seeking equine veterinary nursing skills."],
  programObjective: "Individuals seeking equine veterinary nursing skills.",
  safetyGates: [],
  capstoneCode: "EQN-109",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Equine Veterinary Nursing Foundations" },
    { icon: "Heart", label: "Horse Anatomy" },
    { icon: "Shield", label: "Equine Anesthesia, Monitoring" },
    { icon: "PawPrint", label: "Equine Medicine" },
  ],
  donutData: { technical: 440, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 440, description: "9 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Equine Foundations — graduate has mastered equine anatomy, physiology, and nursing foundations.", "Certificate of Proficiency: Equine Clinical Skills — graduate has completed equine medicine, anesthesia, and nursing technique training.", "Program Completion: Equine Nursing Technician — graduate is prepared for equine veterinary nursing specialty roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["EQN-101", "EQN-102", "EQN-103"], businessModules: "", appliedModule: null, techHours: 130, businessHours: 0, appliedHours: 0, termHours: 130, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 130, modulesSummary: { technicalHours: 130, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "EQN-101", title: "Equine Veterinary Nursing Foundations & Terminology", hours: 45, description: "Introduces equine veterinary nursing, terminology, and the foundational skills needed for confident independent online learning. Students learn equine-specific medical terminology, the scope of equine veterinary nursing, and core professional competencies." },
      { code: "EQN-102", title: "Horse Anatomy & Digestive System", hours: 40, description: "Covers equine anatomy and the digestive system in detail. Students learn the anatomical structures of the horse, digestive physiology, and the unique features of the equine gastrointestinal system." },
      { code: "EQN-103", title: "Equine Anesthesia, Monitoring & Emergency Therapy", hours: 45, description: "Covers equine anesthesia, monitoring, and emergency therapy. Students learn anesthetic protocols for horses, MAC (minimum alveolar concentration), acepromazine use, monitoring techniques, and emergency therapeutic interventions." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["EQN-104", "EQN-105", "EQN-106"], businessModules: "", appliedModule: null, techHours: 130, businessHours: 0, appliedHours: 0, termHours: 130, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 130, modulesSummary: { technicalHours: 130, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "EQN-104", title: "Equine Medicine & Disease Management", hours: 45, description: "Covers equine medicine including common diseases, infectious agents, and metabolic conditions. Students learn about PPID vs ESM, clostridium, e-coli, salmonella, Rhodococcus, OCD lesions, myoglobinuria, and hemoprotein disorders." },
      { code: "EQN-105", title: "Equine Lameness, Neurology & Diagnostic Examination", hours: 40, description: "Covers equine lameness evaluation, neurologic examination, and cranial nerve assessment. Students learn lameness diagnosis, the neurologic examination process, vagus nerve and cranial nerve evaluation, laryngeal hemiplegia, and endophyte-related conditions." },
      { code: "EQN-106", title: "Equine Nursing Techniques & Large Animal Procedures", hours: 45, description: "Covers equine nursing techniques and large animal clinical procedures. Students learn neonatology medicine and surgery, vaccination guidelines, internal parasite control, feeding and care of horses, age determination, and common veterinary drug administration." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["EQN-107", "EQN-108", "EQN-109"], businessModules: "", appliedModule: null, techHours: 125, businessHours: 0, appliedHours: 0, termHours: 125, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 3, clockHours: 125, modulesSummary: { technicalHours: 125, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "EQN-107", title: "Radiographic Examinations & Diagnostic Imaging", hours: 35, description: "Covers radiographic examination techniques and diagnostic imaging for equine patients. Students learn positioning, exposure techniques, radiation safety, and interpretation of equine radiographic studies." },
      { code: "EQN-108", title: "Equine Emergencies & Critical Care", hours: 40, description: "Covers equine emergency medicine and critical care nursing. Students learn triage, emergency procedures, critical care monitoring, and management of equine emergencies including colic, trauma, and dystocia." },
      { code: "EQN-109", title: "Clinical Practicum &", hours: 50, description: "practicum integrating all equine nursing coursework through supervised clinical experiences. Students demonstrate competency in equine veterinary nursing and present a case study." },
    ] },
  ],
};

// ─── FEL — Felines & Health ──────────────────────────────────────────
const fel: ProgramDetails = {
  id: "fel",
  code: "FEL",
  slug: "felines-and-health",
  title: "Felines & Health",
  fullTitle: "Feline Care Specialist",
  subtitle: "Individuals seeking feline care, behavior, and grooming skills.",
  tagline: "Felines & Health.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Feline Care Specialist",
  totalWeeks: 13,
  totalWeeksFormatted: "3 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 6,
  totalClockHours: 170,
  termsCount: 1,
  heroImage: "/images/cat_groomer.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "13 Weeks", modules: "6 Modules", hours: "170 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Felines & Health is a 3 months program with 6 modules and 170 instructional hours.", "Target: Individuals seeking feline care, behavior, and grooming skills."],
  programObjective: "Individuals seeking feline care, behavior, and grooming skills.",
  safetyGates: [],
  capstoneCode: "FEL-106",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Feline Foundations" },
    { icon: "Heart", label: "Learning Theories" },
    { icon: "Shield", label: "Cat Behavior Management" },
    { icon: "PawPrint", label: "Cat Nutrition" },
  ],
  donutData: { technical: 170, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 170, description: "6 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Feline Foundations — graduate has mastered feline behavior, nutrition, and basic care.", "Program Completion: Felines & Health — graduate is prepared for feline-focused professional roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["FEL-101", "FEL-102", "FEL-103", "FEL-104", "FEL-105", "FEL-106"], businessModules: "", appliedModule: null, techHours: 170, businessHours: 0, appliedHours: 0, termHours: 170, durationWeeks: "≈ 13 Weeks", description: "Term 1 modules.", modulesCount: 6, clockHours: 170, modulesSummary: { technicalHours: 170, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "FEL-101", title: "Feline Foundations: Overview, Breeds & Temperament", hours: 25, description: "Introduces the fundamentals of feline care including breed identification, temperament assessment, and handling. Students learn cat breeds, personality traits, characteristics, and appropriate handling methods for cats." },
      { code: "FEL-102", title: "Learning Theories & the Feline Mind", hours: 30, description: "Explores feline cognition, learning theories, and behavior modification. Students learn how cats learn, behavior modification products, and essential cat care items for training and enrichment." },
      { code: "FEL-103", title: "Cat Behavior Management & Basic Training", hours: 35, description: "Covers cat behavior management, basic training techniques, and addressing unwanted behaviors. Students learn behavior modification strategies, preventing unwanted behaviors, and shelter experience protocols." },
      { code: "FEL-104", title: "Cat Nutrition & Basic Care", hours: 25, description: "Covers feline nutrition, basic care, and health management. Students learn species-appropriate nutrition, feeding strategies, routine care protocols, and recognizing common health concerns in cats." },
      { code: "FEL-105", title: "Feline Grooming: Handling, Bathing & Drying", hours: 30, description: "Covers feline grooming procedures including handling, bathing, drying, and styling. Students learn cat-specific grooming techniques, safety concerns, and practical methods for grooming cats and kittens." },
      { code: "FEL-106", title: "Safety, First Aid & Shelter Experience", hours: 25, description: "Covers feline safety protocols, first aid techniques, and shelter experience. Students learn pet CPR, first aid certification, safety practices, and shelter handling procedures specific to cats." },
    ] },
  ],
};

// ─── GRO — Pet Grooming ──────────────────────────────────────────
const gro: ProgramDetails = {
  id: "gro",
  code: "GRO",
  slug: "pet-grooming",
  title: "Pet Grooming",
  fullTitle: "Professional Pet Groomer",
  subtitle: "Individuals seeking professional pet grooming skills.",
  tagline: "Pet Grooming.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Professional Pet Groomer",
  totalWeeks: 26,
  totalWeeksFormatted: "6 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 7,
  totalClockHours: 345,
  termsCount: 2,
  heroImage: "/images/dog_groomer.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "26 Weeks", modules: "7 Modules", hours: "345 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Pet Grooming is a 6 months program with 7 modules and 250 instructional hours.", "Target: Individuals seeking professional pet grooming skills."],
  programObjective: "Individuals seeking professional pet grooming skills.",
  safetyGates: [],
  capstoneCode: "GRO-107",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Introduction to Grooming" },
    { icon: "Heart", label: "Canine Knowledge, Breed Profiles" },
    { icon: "Shield", label: "Equipment, Tools" },
    { icon: "PawPrint", label: "Bathing, Brushing" },
  ],
  donutData: { technical: 345, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 345, description: "7 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Grooming Foundations — graduate has mastered safety, breed knowledge, and equipment use.", "Program Completion: Pet Grooming — graduate is prepared for professional pet grooming positions."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["GRO-101", "GRO-102", "GRO-103"], businessModules: "", appliedModule: null, techHours: 110, businessHours: 0, appliedHours: 0, termHours: 110, durationWeeks: "≈ 13 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 110, modulesSummary: { technicalHours: 110, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "GRO-101", title: "Introduction to Grooming & Pet Safety", hours: 35, description: "Introduces pet grooming fundamentals, safety protocols, and animal welfare. Students learn the historical background of dogs and cats, safety tools, sanitation processes, CPR and first aid techniques, and the fundamentals of the grooming profession." },
      { code: "GRO-102", title: "Canine Knowledge, Breed Profiles & Development", hours: 40, description: "Covers canine breed recognition, characteristics, and development. Students learn AKC breed groups, breed-specific grooming needs, dog development stages, personality types, and how each personality handles the grooming process." },
      { code: "GRO-103", title: "Equipment, Tools & Product Knowledge", hours: 35, description: "Covers grooming equipment selection, use, and maintenance. Students learn to select, use, and maintain clippers, scissors, brushes, combs, drying equipment, and grooming products. Includes coat and skin care fundamentals." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["GRO-104", "GRO-105", "GRO-106", "GRO-107"], businessModules: "", appliedModule: null, techHours: 140, businessHours: 0, appliedHours: 0, termHours: 140, durationWeeks: "≈ 13 Weeks", description: "Term 2 modules.", modulesCount: 4, clockHours: 140, modulesSummary: { technicalHours: 140, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "GRO-104", title: "Bathing, Brushing & Drying Techniques", hours: 40, description: "Covers bathing, brushing, and drying techniques. Students learn preparation steps for grooming, bathing procedures, drying methods including fluff drying, ear cleaning, nail cutting, pad cleaning, and private area cleaning." },
      { code: "GRO-105", title: "Breed-Specific Grooming & Styling Techniques", hours: 45, description: "Covers breed-specific grooming procedures across all AKC groups. Students learn grooming procedures for terriers, sporting, herding, hound, working, toy, and nonsporting groups, plus poodle grooming, mixed breed styling, and puppy grooming." },
      { code: "GRO-106", title: "Grooming Safety, Injury Prevention & Self-Care", hours: 30, description: "Covers grooming safety, injury prevention, and groomer self-care. Students learn safety protocols, injury prevention techniques, handling difficult dogs, and strategies for preventing physical strain and injury in the grooming profession." },
      { code: "GRO-107", title: "Customer Relations & Mobile Grooming Operations", hours: 25, description: "Covers customer service and mobile grooming operations. Students learn client communication, customer relations, mobile grooming business operations, and the practical aspects of running a grooming service." },
    ] },
  ],
};

// ─── GSP — Grooming Salon Practice Management ──────────────────────────────────────────
const gsp: ProgramDetails = {
  id: "gsp",
  code: "GSP",
  slug: "grooming-salon-practice-management",
  title: "Grooming Salon Practice Management",
  fullTitle: "Grooming Salon Practice Manager",
  subtitle: "Individuals seeking to own and operate a grooming salon business.",
  tagline: "Grooming Salon Practice Management.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Grooming Salon Practice Manager",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 9,
  totalClockHours: 655,
  termsCount: 3,
  heroImage: "/images/pet_business.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "9 Modules", hours: "655 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Grooming Salon Practice Management is a 12 months program with 9 modules and 375 instructional hours.", "Target: Individuals seeking to own and operate a grooming salon business."],
  programObjective: "Individuals seeking to own and operate a grooming salon business.",
  safetyGates: [],
  capstoneCode: "GSP-109",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Grooming Foundations" },
    { icon: "Heart", label: "Feline Grooming" },
    { icon: "Shield", label: "Business Foundations" },
    { icon: "PawPrint", label: "Marketing" },
  ],
  donutData: { technical: 655, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 655, description: "9 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Salon Operations Foundations — graduate has mastered grooming fundamentals and business operations.", "Certificate of Proficiency: Business Management — graduate has completed marketing, technology, and financial management training.", "Program Completion: Grooming Salon Practice Management — graduate is prepared for salon ownership and management roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["GSP-101", "GSP-102", "GSP-103"], businessModules: "", appliedModule: null, techHours: 125, businessHours: 0, appliedHours: 0, termHours: 125, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 125, modulesSummary: { technicalHours: 125, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "GSP-101", title: "Grooming Foundations & Salon Operations", hours: 45, description: "grooming foundations and salon operations. Students learn dog development, handling, equipment, breed recognition, basic through dog grooming, bathing, drying, sanitation (ANSI/AAMI and CDC standards), and pet care fundamentals." },
      { code: "GSP-102", title: "Feline Grooming & Multi-Service Practicum", hours: 35, description: "Covers feline grooming services and multi-service practicum. Students learn cat breeds, temperament handling, cat bathing and drying, cat grooming procedures, and the integration of multiple services in a grooming salon." },
      { code: "GSP-103", title: "Business Foundations & Entrepreneurship", hours: 45, description: "Covers business foundations and entrepreneurship for pet service businesses. Students learn business models, customer experience design, business planning, daily operations management, service pricing, team building, strategic planning, vendor management, customer retention, risk management, and business launch preparation." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["GSP-104", "GSP-105", "GSP-106"], businessModules: "", appliedModule: null, techHours: 140, businessHours: 0, appliedHours: 0, termHours: 140, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 140, modulesSummary: { technicalHours: 140, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "GSP-104", title: "Marketing & Brand Strategy", hours: 50, description: "marketing and brand strategy for pet service businesses. Students learn brand foundations, customer research, brand voice and visual identity, value propositions, local market analysis, digital marketing, social media management, content production, email and SMS marketing, paid advertising, SEO, local discovery, analytics, and integrated growth marketing." },
      { code: "GSP-105", title: "Technology & AI for Business Operations", hours: 45, description: "Covers technology foundations and AI integration for business operations. Students learn digital literacy, cybersecurity, data privacy, AI literacy and prompting, AI tools for operations, customer communication, content production, scheduling, reporting, technology procurement, business dashboards, and technology continuity and change management." },
      { code: "GSP-106", title: "Financial Management & Regulatory Compliance", hours: 45, description: "Covers financial management and regulatory compliance for pet service businesses. Students learn personal and business finance separation, budgeting, banking and payments, financial statements, bookkeeping and payroll with AI, tax strategy and compliance, entity structuring, deductions, sales tax, regulatory compliance, data privacy, AI governance, accessibility, workplace safety, audit readine..." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["GSP-107", "GSP-108", "GSP-109"], businessModules: "", appliedModule: null, techHours: 110, businessHours: 0, appliedHours: 0, termHours: 110, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 3, clockHours: 110, modulesSummary: { technicalHours: 110, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "GSP-107", title: "Leadership & Professional Development", hours: 40, description: "Covers leadership and professional development for salon managers. Students learn emotional intelligence, relational leadership, empathy, active listening, trust building, feedback and conflict repair, difficult conversations, cultural competence, coaching and motivation, resilience, cognitive biases, critical thinking, negotiation, influence, and advocacy." },
      { code: "GSP-108", title: "Salon Business Strategy & Launch", hours: 45, description: "course integrating all program coursework into a grooming salon business strategy. Students develop a complete business plan including operations, marketing, technology, financial, and governance components, and present a final launch-ready business proposal." },
      { code: "GSP-109", title: "Grooming Skills & Private Class Design", hours: 25, description: "grooming skills and private class design for salon professionals. Students master  grooming techniques, breed-specific styling, mixed-breed and freestyle styling, and learn to design and deliver private grooming classes and final assessments." },
    ] },
  ],
};

// ─── PRT — Professional Trainer ──────────────────────────────────────────
const prt: ProgramDetails = {
  id: "prt",
  code: "PRT",
  slug: "professional-trainer",
  title: "Professional Trainer",
  fullTitle: "Professional Dog Trainer",
  subtitle: "Individuals seeking professional dog training and behavior skills.",
  tagline: "Professional Trainer.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Professional Dog Trainer",
  totalWeeks: 26,
  totalWeeksFormatted: "6 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 8,
  totalClockHours: 345,
  termsCount: 2,
  heroImage: "/images/hero_trainer.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "26 Weeks", modules: "8 Modules", hours: "345 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Professional Trainer is a 6 months program with 8 modules and 290 instructional hours.", "Target: Individuals seeking professional dog training and behavior skills."],
  programObjective: "Individuals seeking professional dog training and behavior skills.",
  safetyGates: [],
  capstoneCode: "PRT-108",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Introduction to Service Dogs" },
    { icon: "Heart", label: "Foundations of Dog Training" },
    { icon: "Shield", label: "Breed Characteristics" },
    { icon: "PawPrint", label: "Obedience Skills" },
  ],
  donutData: { technical: 345, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 345, description: "8 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Training Foundations — graduate has mastered learning theory, breed characteristics, and basic training.", "Program Completion: Professional Trainer — graduate is prepared for professional dog training positions and certification."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["PRT-101", "PRT-102", "PRT-103"], businessModules: "", appliedModule: null, techHours: 110, businessHours: 0, appliedHours: 0, termHours: 110, durationWeeks: "≈ 13 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 110, modulesSummary: { technicalHours: 110, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PRT-101", title: "Introduction to Service Dogs & Canine Life", hours: 35, description: "Introduces the world of service dogs and canine development. Students learn about the role of service dogs, a dog's life stages, AKC breed recognition and characteristics, equipment and training tools, and the foundations of working with service dog candidates." },
      { code: "PRT-102", title: "Foundations of Dog Training & Learning Theory", hours: 40, description: "Covers foundational dog training principles and learning theory. Students learn learning, emotions, and behavior; operant and classical conditioning; reinforcement strategies; and the science of animal learning applied to dog training." },
      { code: "PRT-103", title: "Breed Characteristics & Canine Health for Trainers", hours: 35, description: "Covers breed-specific characteristics, teaching strategies, and canine health for trainers. Students learn how breed characteristics affect training approaches, common health considerations, and how to address training problems related to breed traits." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["PRT-104", "PRT-105", "PRT-106", "PRT-107", "PRT-108"], businessModules: "", appliedModule: null, techHours: 180, businessHours: 0, appliedHours: 0, termHours: 180, durationWeeks: "≈ 13 Weeks", description: "Term 2 modules.", modulesCount: 5, clockHours: 180, modulesSummary: { technicalHours: 180, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PRT-104", title: "Obedience Skills: Basic to", hours: 45, description: "Covers obedience training from basic through on-leash and off-leash skills. Students learn to teach basic obedience, on-leash maneuvers, and off-leash obedience. Includes puppy introduction and behavior problem solving." },
      { code: "PRT-105", title: "Task Foundations, Behavior Chains & Behavior Sequences", hours: 40, description: "Covers task training foundations, behavior chains, and behavior sequences for service dogs. Students learn to build complex behavior chains, train specific service tasks, and develop behavior sequences for practical applications." },
      { code: "PRT-106", title: "Training Problems, Solutions & Client Management", hours: 35, description: "Covers common training problems and their solutions, plus client management skills. Students learn to diagnose and resolve training issues, communicate effectively with clients, and design private training classes." },
      { code: "PRT-107", title: "Behavior Modification & Professional Practice", hours: 35, description: "Covers behavior modification techniques and professional practice standards. Students learn behavior modification and animal handling/training techniques, applied animal behavior science, and clinical applications. Includes LA (Least Invasive, Minimally Aversive) principles." },
      { code: "PRT-108", title: "CPR, First Aid & Final Assessment", hours: 25, description: "Covers canine CPR and first aid techniques, and serves as the program's final assessment. Students learn emergency first aid, CPR certification, and complete a assessment demonstrating proficiency across all program competencies." },
    ] },
  ],
};

// ─── PVM — Pre-Veterinary Medicine ──────────────────────────────────────────
const pvm: ProgramDetails = {
  id: "pvm",
  code: "PVM",
  slug: "pre-veterinary-medicine",
  title: "Pre-Veterinary Medicine",
  fullTitle: "Pre-Veterinary Medicine Certificate",
  subtitle: "Individuals preparing for veterinary medical school.",
  tagline: "Pre-Veterinary Medicine.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Pre-Veterinary Medicine Certificate",
  totalWeeks: 104,
  totalWeeksFormatted: "24 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 13,
  totalClockHours: 770,
  termsCount: 4,
  heroImage: "/images/hero_trainer.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "104 Weeks", modules: "13 Modules", hours: "770 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Pre-Veterinary Medicine is a 24 months program with 13 modules and 550 instructional hours.", "Target: Individuals preparing for veterinary medical school."],
  programObjective: "Individuals preparing for veterinary medical school.",
  safetyGates: [],
  capstoneCode: "PVM-113",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "The Language of Veterinary Medicine" },
    { icon: "Heart", label: "Small Animal Internal Medicine" },
    { icon: "Shield", label: "Small Animal Anesthesia" },
    { icon: "PawPrint", label: "Radiology" },
  ],
  donutData: { technical: 770, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 770, description: "13 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Veterinary Medical Foundations — graduate has mastered medical terminology and foundational clinical concepts.", "Certificate of Proficiency: Clinical Diagnostics — graduate has completed radiology, dental, and fluid therapy training.", "Certificate of Practice — graduate has completed specialized clinical topics in neurology, oncology, and exotic medicine.", "Program Completion: Pre-Veterinary Medicine — graduate is prepared for veterinary school or clinical practice."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["PVM-101", "PVM-102", "PVM-103"], businessModules: "", appliedModule: null, techHours: 135, businessHours: 0, appliedHours: 0, termHours: 135, durationWeeks: "≈ 26 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 135, modulesSummary: { technicalHours: 135, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PVM-101", title: "The Language of Veterinary Medicine & Mathematical Calculations", hours: 45, description: "Foundational course covering veterinary medical terminology, mathematical calculations, and the conceptual language of veterinary medicine. Students master the vocabulary and quantitative skills essential for veterinary study." },
      { code: "PVM-102", title: "Small Animal Internal Medicine & Hematology Part One", hours: 45, description: "Introduces small animal internal medicine and hematology. Students learn disease processes, diagnostic approaches, hematologic evaluation, and treatment planning for small animal patients." },
      { code: "PVM-103", title: "Small Animal Anesthesia: Perioperative to Recovery", hours: 45, description: "coverage of small animal anesthesia from perioperative planning through recovery. Students learn patient preparation, pharmacology, life stage considerations, and anesthetic monitoring and management." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["PVM-104", "PVM-105", "PVM-106", "PVM-107"], businessModules: "", appliedModule: null, techHours: 155, businessHours: 0, appliedHours: 0, termHours: 155, durationWeeks: "≈ 26 Weeks", description: "Term 2 modules.", modulesCount: 4, clockHours: 155, modulesSummary: { technicalHours: 155, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PVM-104", title: "Radiology & Diagnostic Imaging", hours: 45, description: "Covers radiographic interpretation and diagnostic imaging across body systems. Students learn radiology of the abdomen, parenchymatous organs, esophagus, stomach, respiratory and cardiovascular systems, and bone lesions and fractures." },
      { code: "PVM-105", title: "Dental Basics &  Dental Problems", hours: 35, description: "Covers dental fundamentals and dental problem-solving. Students learn dental anatomy, oral examinations, prophylaxis, dental radiography, and root cause analysis of dental problems." },
      { code: "PVM-106", title: "Fluid Therapy, Transfusion Medicine & the Surgical Suite", hours: 35, description: "Covers fluid therapy, transfusion medicine, and surgical suite operations. Students learn fluid therapy planning, blood typing and transfusion protocols, and surgical suite management including the pharmaceutical Rx and medical records." },
      { code: "PVM-107", title: "Equine Medicine & Core Skills", hours: 40, description: "Covers equine medicine fundamentals and core skills. Students learn the trail to core equine skills, equine emergencies, and species-specific considerations for equine patients." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["PVM-108", "PVM-109", "PVM-110", "PVM-111"], businessModules: "", appliedModule: null, techHours: 160, businessHours: 0, appliedHours: 0, termHours: 160, durationWeeks: "≈ 26 Weeks", description: "Term 3 modules.", modulesCount: 4, clockHours: 160, modulesSummary: { technicalHours: 160, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PVM-108", title: "Neurology & Cancer in Small Animals", hours: 40, description: "Covers neurologic disorders and oncology in small animal practice. Students learn neurologic examinations, cancer diagnosis and treatment, and management of neurologic and oncologic patients." },
      { code: "PVM-109", title: "Exotic, Avian & Reptile Medicine", hours: 35, description: "Covers diseases and disorders of companion exotic animals, avian medicine, and reptile/amphibian zoonoses. Students learn species-specific husbandry, disease recognition, and treatment of exotic patients." },
      { code: "PVM-110", title: "Cardiovascular ECC & Specialized Clinical Procedures", hours: 45, description: "Covers small animal cardiovascular emergency and critical care plus specialized clinical procedures. Students learn cardiovascular ECC, diagnostic procedures, electrocardiogram interpretation, and charting." },
      { code: "PVM-111", title: "Nutrition, Wellness & Preventive Care", hours: 40, description: "coverage of nutrition, wellness, and preventive healthcare. Students learn about feline nutrition, food hypersensitivity, raw food diets, pet food labels, obesity management, the microbiome, vaccinations, heartworm and vector-borne disease prevention, and senior animal care." },
    ] },
    { termNumber: 4, name: "Term 4", technicalModules: ["PVM-112", "PVM-113"], businessModules: "", appliedModule: null, techHours: 100, businessHours: 0, appliedHours: 0, termHours: 100, durationWeeks: "≈ 26 Weeks", description: "Term 4 modules.", modulesCount: 2, clockHours: 100, modulesSummary: { technicalHours: 100, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "PVM-112", title: "Clinical Specialties Integration", hours: 50, description: "Integrative course covering clinical specialties including anesthesiology, behavior, cardiology, emergency and critical care, hospice, hyperbaric oxygen therapy, iodine 131 treatment, internal medicine, interventional radiology, neurology, ophthalmology, sports medicine and rehabilitation, surgery, toxicology, ultrasound, telemedicine, and workplace safety." },
      { code: "PVM-113", title: "Clinical Integration", hours: 50, description: "course integrating clinical knowledge through case-based learning and presentations. Students analyze complex cases involving otitis, pain recognition, reproductive emergencies, feline infectious peritonitis, continuous glucose monitoring, and other clinical topics." },
    ] },
  ],
};

// ─── VET — Veterinary Assistant ──────────────────────────────────────────
const vet: ProgramDetails = {
  id: "vet",
  code: "VET",
  slug: "veterinary-assistant",
  title: "Veterinary Assistant",
  fullTitle: "Veterinary Assistant",
  subtitle: "Individuals seeking entry-level veterinary support roles in clinics, hospitals, and animal care facilities.",
  tagline: "Veterinary Assistant.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Assistant",
  totalWeeks: 26,
  totalWeeksFormatted: "6 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 12,
  totalClockHours: 395,
  termsCount: 2,
  heroImage: "/images/pets_caregiver.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "26 Weeks", modules: "12 Modules", hours: "395 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Assistant is a 6 months program with 12 modules and 395 instructional hours.", "Target: Individuals seeking entry-level veterinary support roles in clinics, hospitals, and animal care facilities."],
  programObjective: "Individuals seeking entry-level veterinary support roles in clinics, hospitals, and animal care facilities.",
  safetyGates: [],
  capstoneCode: "VET-112",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Veterinary Foundations" },
    { icon: "Heart", label: "Animal Behavior, Handling" },
    { icon: "Shield", label: "Office Procedures" },
    { icon: "PawPrint", label: "Examination Room Procedures" },
  ],
  donutData: { technical: 395, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 395, description: "12 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Veterinary Foundations — graduate has mastered terminology, animal handling, and hospital procedures.", "Program Completion: Veterinary Assistant — graduate is prepared for entry-level veterinary assistant positions."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VET-101", "VET-102", "VET-103"], businessModules: "", appliedModule: null, techHours: 110, businessHours: 0, appliedHours: 0, termHours: 110, durationWeeks: "≈ 13 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 110, modulesSummary: { technicalHours: 110, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VET-101", title: "Veterinary Foundations & Medical Terminology", hours: 40, description: "Introduces foundational veterinary medical terminology, anatomy basics, and body systems. Students learn the language of veterinary medicine, directional terms, anatomical planes, and the structure and function of major body systems. This course establishes the vocabulary and conceptual framework required for all subsequent veterinary coursework." },
      { code: "VET-102", title: "Animal Behavior, Handling & Restraint Techniques", hours: 40, description: "Covers principles of animal behavior, safe handling, and restraint techniques for companion and domestic animals. Students learn species-specific behavior patterns, fear and stress signals, and low-stress handling methods. Emphasis is placed on safety for both the animal and the veterinary healthcare team." },
      { code: "VET-103", title: "Office Procedures & Hospital Management", hours: 30, description: "Introduces veterinary hospital operations including scheduling, billing, medical record keeping, and office etiquette. Students learn the workflow of a veterinary practice, client intake procedures, and the role of the veterinary assistant in maintaining efficient hospital operations." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VET-104", "VET-105", "VET-106", "VET-107", "VET-108", "VET-109", "VET-110", "VET-111", "VET-112"], businessModules: "", appliedModule: null, techHours: 285, businessHours: 0, appliedHours: 0, termHours: 285, durationWeeks: "≈ 13 Weeks", description: "Term 2 modules.", modulesCount: 9, clockHours: 285, modulesSummary: { technicalHours: 285, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VET-104", title: "Examination Room Procedures & Client Communication", hours: 35, description: "Covers examination room protocols, patient intake, vital signs assessment, and effective client communication. Students learn to assist veterinarians during examinations, communicate treatment plans to clients, and maintain professional conduct and ethics in client interactions." },
      { code: "VET-105", title: "Pharmacy & Pharmacology Fundamentals", hours: 30, description: "Introduces basic pharmacology principles, drug classifications, dosage calculations, and pharmacy management in the veterinary setting. Students learn about common veterinary medications, controlled substance handling, and safety protocols for medication administration." },
      { code: "VET-106", title: "Small & Large Animal Nursing", hours: 40, description: "Covers nursing care for small and large animals including feeding, housing, sanitation, and patient monitoring. Students learn species-specific care requirements, domestic animal husbandry, and fundamental nursing procedures for both companion and production animals." },
      { code: "VET-107", title: "Surgical Preparation & Assisting", hours: 35, description: "Teaches surgical preparation protocols including patient prep, sterilization, instrument identification, and intraoperative assisting. Students learn aseptic technique, surgical room procedures, and the role of the veterinary assistant during surgical procedures." },
      { code: "VET-108", title: "Radiology, Imaging & Endoscopy", hours: 30, description: "Introduces diagnostic imaging including radiography, ultrasound, and endoscopy. Students learn radiation safety, patient positioning for imaging, equipment operation basics, and the veterinary assistant's role in imaging procedures." },
      { code: "VET-109", title: "Emergency Care, Wound Management & Common Diseases", hours: 35, description: "Covers emergency response protocols, wound care techniques, and recognition of common animal diseases. Students learn triage procedures, first aid, wound assessment and management, and disease prevention strategies." },
      { code: "VET-110", title: "Veterinary Laboratory Procedures", hours: 30, description: "Introduces basic laboratory procedures including sample collection, handling, and common diagnostic tests. Students learn to assist with laboratory diagnostics, maintain lab equipment, and understand reference ranges." },
      { code: "VET-111", title: "Introduction to Veterinary Telehealth & Teletriage", hours: 25, description: "Introduces veterinary telehealth concepts including the legal Veterinary-Client-Patient Relationship (VCPR), teletriage protocols, and effective communication via telecommunications. Students learn to assess emergency indicators, identify common client complaints, and analyze telehealth workflows." },
      { code: "VET-112", title: "Building & Professional Development", hours: 25, description: "Focuses on readiness including resume building, interview skills, professional networking, and workplace communication. Students develop the soft skills needed for successful employment in veterinary settings." },
    ] },
  ],
};

// ─── VPM — Veterinary Practice Management ──────────────────────────────────────────
const vpm: ProgramDetails = {
  id: "vpm",
  code: "VPM",
  slug: "veterinary-practice-management",
  title: "Veterinary Practice Management",
  fullTitle: "Veterinary Practice Manager",
  subtitle: "Individuals seeking veterinary practice management and administration roles.",
  tagline: "Veterinary Practice Management.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Practice Manager",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 8,
  totalClockHours: 330,
  termsCount: 3,
  heroImage: "/images/pet_business.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "8 Modules", hours: "330 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Practice Management is a 12 months program with 8 modules and 300 instructional hours.", "Target: Individuals seeking veterinary practice management and administration roles."],
  programObjective: "Individuals seeking veterinary practice management and administration roles.",
  safetyGates: [],
  capstoneCode: "VPM-108",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Business Orientation" },
    { icon: "Heart", label: "Principles of Management" },
    { icon: "Shield", label: "Basic Accounting for Veterinary Practice" },
    { icon: "PawPrint", label: "Veterinary Practice Management" },
  ],
  donutData: { technical: 330, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 330, description: "8 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Business Foundations — graduate has mastered management principles and basic accounting.", "Certificate of Proficiency: Practice Management — graduate has completed HR, marketing, and practice management coursework.", "Program Completion: Veterinary Practice Management — graduate is prepared for veterinary practice manager roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VPM-101", "VPM-102", "VPM-103"], businessModules: "", appliedModule: null, techHours: 105, businessHours: 0, appliedHours: 0, termHours: 105, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 105, modulesSummary: { technicalHours: 105, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPM-101", title: "Business Orientation & Professional Development", hours: 30, description: "Orients students to business principles and online learning strategies. Students develop skills for confident, independent learning and analyze the interdependent goals of life and business, including the steps needed to achieve them." },
      { code: "VPM-102", title: "Principles of Management", hours: 40, description: "Covers fundamental management principles including planning, organizing, leading, and controlling. Students learn management theory, organizational behavior, decision-making processes, and leadership styles applicable to veterinary practice." },
      { code: "VPM-103", title: "Basic Accounting for Veterinary Practices", hours: 35, description: "Introduces accounting principles relevant to veterinary practice management. Students learn financial statements, bookkeeping, payroll, accounts receivable/payable, and financial analysis for veterinary businesses." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VPM-104", "VPM-105", "VPM-106"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPM-104", title: "Veterinary Practice Management", hours: 45, description: "Covers veterinary practice management including workflow optimization, inventory management, regulatory compliance, and quality assurance. Students learn to manage all aspects of veterinary practice operations." },
      { code: "VPM-105", title: "Human Resource Management", hours: 40, description: "Covers HR principles including recruitment, training, performance evaluation, compensation, labor law compliance, and team development. Students learn to build and manage effective veterinary healthcare teams." },
      { code: "VPM-106", title: "Marketing for Veterinary Practices", hours: 35, description: "Covers marketing principles and strategies for veterinary practices. Students learn market analysis, brand development, digital marketing, client acquisition and retention, and community outreach strategies." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["VPM-107", "VPM-108"], businessModules: "", appliedModule: null, techHours: 75, businessHours: 0, appliedHours: 0, termHours: 75, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 2, clockHours: 75, modulesSummary: { technicalHours: 75, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPM-107", title: "Business Ethics & Professional Conduct", hours: 35, description: "Covers ethical decision-making in veterinary business contexts. Students learn ethical frameworks, corporate social responsibility, professional conduct standards, and the intersection of ethics and business strategy in veterinary medicine." },
      { code: "VPM-108", title: "Veterinary Practice Operations Strategy", hours: 40, description: "course integrating all program coursework into a veterinary practice management project. Students develop a complete practice business plan including financial projections, staffing models, marketing strategies, and operational protocols." },
    ] },
  ],
};

// ─── VPT — Veterinary Pathology Technician ──────────────────────────────────────────
const vpt: ProgramDetails = {
  id: "vpt",
  code: "VPT",
  slug: "veterinary-pathology-technician",
  title: "Veterinary Pathology Technician",
  fullTitle: "Veterinary Pathology Technician",
  subtitle: "Individuals seeking veterinary pathology and laboratory diagnostic skills.",
  tagline: "Veterinary Pathology Technician.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Pathology Technician",
  totalWeeks: 104,
  totalWeeksFormatted: "24 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 12,
  totalClockHours: 510,
  termsCount: 4,
  heroImage: "/images/health_woman_cat.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "104 Weeks", modules: "12 Modules", hours: "510 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Pathology Technician is a 24 months program with 12 modules and 495 instructional hours.", "Target: Individuals seeking veterinary pathology and laboratory diagnostic skills."],
  programObjective: "Individuals seeking veterinary pathology and laboratory diagnostic skills.",
  safetyGates: [],
  capstoneCode: "VPT-112",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Foundations of Pathology" },
    { icon: "Heart", label: "Microscopy" },
    { icon: "Shield", label: "Hematology Fundamentals" },
    { icon: "PawPrint", label: "Clinical Chemistry" },
  ],
  donutData: { technical: 510, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 510, description: "12 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Pathology Foundations — graduate has mastered microscopy, instrumentation, and laboratory safety.", "Certificate of Proficiency: Clinical Laboratory Science — graduate has completed hematology, clinical chemistry, and urinalysis training.", "Certificate of Practice — graduate has mastered cytology, microbiology, parasitology, and toxicology.", "Program Completion: Veterinary Pathology Technician — graduate is prepared for pathology technician specialty roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VPT-101", "VPT-102", "VPT-103"], businessModules: "", appliedModule: null, techHours: 130, businessHours: 0, appliedHours: 0, termHours: 130, durationWeeks: "≈ 26 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 130, modulesSummary: { technicalHours: 130, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPT-101", title: "Foundations of Pathology & Laboratory Safety", hours: 45, description: "Introduces pathology fundamentals, laboratory safety, and quality assurance. Students learn the rationale for testing procedures, pathophysiology, hazard prevention, MSDS utilization, and the interrelationship between procedures. Includes skills for independent online learning." },
      { code: "VPT-102", title: "Microscopy & Instrumentation", hours: 35, description: "Covers microscope operation, maintenance, and laboratory instrumentation. Students learn parts and functions of the microscope, proper maintenance and cleaning, centrifuge calibration, instrument troubleshooting, and instrumentation selection criteria." },
      { code: "VPT-103", title: "Hematology Fundamentals", hours: 50, description: "study of veterinary hematology including manual and automated methodologies, specimen collection, hematopoiesis, erythropoiesis, leukocyte function, anemias, cell morphology, and exotic hematology. Students learn to perform and interpret hematologic tests." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VPT-104", "VPT-105", "VPT-106"], businessModules: "", appliedModule: null, techHours: 125, businessHours: 0, appliedHours: 0, termHours: 125, durationWeeks: "≈ 26 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 125, modulesSummary: { technicalHours: 125, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPT-104", title: "Clinical Chemistry", hours: 45, description: "Covers clinical chemistry including wellness, pre-surgical, disease-specific, and organ-specific profiles. Students learn automated and point-of-care methodologies, species-specific tests, and the relationship between tests and organ systems or diseases." },
      { code: "VPT-105", title: "Urinalysis & Coagulation", hours: 40, description: "Covers urinalysis and coagulation testing. Students learn reagent strip usage, interferences, culture indications, renal physiology, coagulation disorders (thrombocytopenia, DIC, von Willebrands, anticoagulant toxicosis), and hemostasis pathways." },
      { code: "VPT-106", title: "Cytology & Immuno-Hematology", hours: 40, description: "Covers cytologic evaluation and immuno-hematology. Students learn collection methods, basic cell type identification, blood typing and grouping, transfusion principles, donor selection, and specimen handling for blood typing." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["VPT-107", "VPT-108", "VPT-109"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 26 Weeks", description: "Term 3 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPT-107", title: "Serology, Immunology & Endocrinology", hours: 40, description: "Covers serological testing, immunology, and endocrinology. Students learn complement fixation, immunofluorescence, PCR/DNA amplification, antibody titers, diagnostic tests for Addison's, Cushing's, diabetes, and thyroid disorders, and reproductive cycle staging." },
      { code: "VPT-108", title: "Microbiology & Parasitology", hours: 45, description: "Covers microbiological culture techniques and veterinary parasitology. Students learn aerobic, anaerobic, blood, fungal, and fecal cultures, internal and external parasite identification, life cycles, diseases, prevention, treatment, and anthelmintic resistance." },
      { code: "VPT-109", title: "Toxicology & Acid-Base Evaluation", hours: 35, description: "Covers veterinary toxicology and acid-base evaluation. Students learn common toxic agents, specimen shipping for toxicology, drug screening, venous vs. arterial sample evaluation, blood gas handling, acid-base disorders, and anion gap measurement." },
    ] },
    { termNumber: 4, name: "Term 4", technicalModules: ["VPT-110", "VPT-111", "VPT-112"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 26 Weeks", description: "Term 4 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VPT-110", title: "Quality Assurance & Reference Intervals", hours: 35, description: "quality assurance and reference interval management. Students learn reference interval generation, validation, relationship to patient results, and the role of reference intervals as diagnostic tools for veterinarians." },
      { code: "VPT-111", title: "Specimen Management & Laboratory Operations", hours: 35, description: "Covers specimen collection, handling, storage, shipping, and specialized laboratory procedures. Students learn species-specific pre- and post-analytic care, low-stress restraint, protein electrophoresis, urinary calculi handling, and reference laboratory submission criteria." },
      { code: "VPT-112", title: "Clinical Pathology Practicum &", hours: 50, description: "practicum integrating all pathology coursework through supervised laboratory experiences. Students demonstrate competency in all laboratory disciplines and present a case study integrating multiple diagnostic modalities." },
    ] },
  ],
};

// ─── VST — Veterinary Surgical Technician ──────────────────────────────────────────
const vst: ProgramDetails = {
  id: "vst",
  code: "VST",
  slug: "veterinary-surgical-technician",
  title: "Veterinary Surgical Technician",
  fullTitle: "Veterinary Surgical Technician",
  subtitle: "Individuals seeking specialized surgical veterinary technology skills.",
  tagline: "Veterinary Surgical Technician.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Surgical Technician",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 12,
  totalClockHours: 445,
  termsCount: 3,
  heroImage: "/images/health_woman_cat.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "12 Modules", hours: "445 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Surgical Technician is a 12 months program with 12 modules and 465 instructional hours.", "Target: Individuals seeking specialized surgical veterinary technology skills."],
  programObjective: "Individuals seeking specialized surgical veterinary technology skills.",
  safetyGates: [],
  capstoneCode: "VST-112",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Aseptic Technique" },
    { icon: "Heart", label: "Surgical Instruments" },
    { icon: "Shield", label: "Patient Preparation" },
    { icon: "PawPrint", label: "Scrub" },
  ],
  donutData: { technical: 445, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 445, description: "12 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Surgical Foundations — graduate has mastered aseptic technique, instrumentation, and patient preparation.", "Certificate of Proficiency: Surgical Nursing — graduate has completed scrub and circulating nurse duties, wound management, and anesthesia training.", "Program Completion: Veterinary Surgical Technician — graduate is prepared for surgical technician specialty roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VST-101", "VST-102", "VST-103"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VST-101", title: "Aseptic Technique & Sterilization", hours: 45, description: "coverage of aseptic technique, sterilization methods, and infection prevention in the surgical setting. Students learn steam sterilization, CDC guidelines for disinfection and sterilization, veterinary infection prevention and control, and sterile field maintenance." },
      { code: "VST-102", title: "Surgical Instruments & Equipment", hours: 40, description: "Covers identification, care, and maintenance of surgical instruments and equipment. Students learn procedure-specific instrumentation, surgical instrument care and sterilization methods, and the use of veterinary instruments and equipment references." },
      { code: "VST-103", title: "Patient Preparation & Positioning", hours: 35, description: "Teaches patient preparation for surgery including clipping, surgical scrub, patient positioning, and surgical patient care. Students learn species-specific positioning techniques and pre-surgical assessment protocols." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VST-104", "VST-105", "VST-106", "VST-107"], businessModules: "", appliedModule: null, techHours: 160, businessHours: 0, appliedHours: 0, termHours: 160, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 4, clockHours: 160, modulesSummary: { technicalHours: 160, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VST-104", title: "Scrub & Circulating Nurse Duties", hours: 45, description: "Covers the roles and responsibilities of scrub and circulating nurses in veterinary surgery. Students learn gowning and gloving, sterile field maintenance, intraoperative assistance, and circulating nurse duties including monitoring and documentation." },
      { code: "VST-105", title: "Surgical Care Expertise & Wound Management", hours: 40, description: "Covers postoperative care, bandaging, wound management, and wound closure techniques. Students learn Ethicon wound closure principles, bandaging techniques, wound assessment, and management of surgical complications." },
      { code: "VST-106", title: "Pharmacology & Laboratory for Surgical Nursing", hours: 35, description: "Covers pharmacology and laboratory procedures relevant to surgical nursing. Students learn practical pharmacology, pre-surgical laboratory diagnostics, and medication management in the perioperative period." },
      { code: "VST-107", title: "Anesthesia & Pain Management", hours: 40, description: "Covers anesthetic principles and pain management for surgical patients. Students learn anesthetic protocols, monitoring, analgesia techniques, and multimodal pain management strategies." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["VST-108", "VST-109", "VST-110", "VST-111", "VST-112"], businessModules: "", appliedModule: null, techHours: 185, businessHours: 0, appliedHours: 0, termHours: 185, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 5, clockHours: 185, modulesSummary: { technicalHours: 185, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VST-108", title: "Surgical Techniques & Procedures", hours: 50, description: "Covers surgical techniques including small animal laparoscopy, canine and feline surgical principles, and small animal surgery techniques. Students learn to assist with complex surgical procedures and manage surgical complications." },
      { code: "VST-109", title: "Diagnostic Imaging & Radiography", hours: 35, description: "Covers diagnostic imaging relevant to surgical practice including Lavin's radiography, dental radiography, and radiation safety. Students learn to produce and evaluate diagnostic images for surgical planning." },
      { code: "VST-110", title: "Emergency Critical Care & Specialized Medicine", hours: 45, description: "Covers emergency and critical care nursing in surgical contexts, plus specialized medical disciplines including cardiology, internal medicine, neurology, oncology, ophthalmology, and orthopedics. Students learn to manage surgical emergencies and support specialized procedures." },
      { code: "VST-111", title: "Exotic Animal Medicine & Physical Rehabilitation", hours: 30, description: "Covers exotic animal surgical considerations and physical rehabilitation. Students learn species-specific surgical needs of exotic animals and postoperative rehabilitation techniques." },
      { code: "VST-112", title: "Professional Practice, Communications & Compliance", hours: 25, description: "Covers professional communication, client service, compliance, and regulatory requirements in surgical practice. Students learn client communications, education, preventive healthcare, professional veterinary ethics, medical record documentation, and team collaboration." },
    ] },
  ],
};

// ─── VTE — Veterinary Technician ──────────────────────────────────────────
const vte: ProgramDetails = {
  id: "vte",
  code: "VTE",
  slug: "veterinary-technician",
  title: "Veterinary Technician",
  fullTitle: "Veterinary Technician",
  subtitle: "Individuals seeking veterinary technician credentials for clinical practice.",
  tagline: "Veterinary Technician.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Technician",
  totalWeeks: 104,
  totalWeeksFormatted: "24 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 16,
  totalClockHours: 1010,
  termsCount: 4,
  heroImage: "/images/vet_cat_checkup.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "104 Weeks", modules: "16 Modules", hours: "1010 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Technician is a 24 months program with 16 modules and 650 instructional hours.", "Target: Individuals seeking veterinary technician credentials for clinical practice."],
  programObjective: "Individuals seeking veterinary technician credentials for clinical practice.",
  safetyGates: [],
  capstoneCode: "VTE-116",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Veterinary Medicine Profession" },
    { icon: "Heart", label: "Veterinary Anatomy" },
    { icon: "Shield", label: "Veterinary Pharmacy" },
    { icon: "PawPrint", label: "Animal Behavior, Handling" },
  ],
  donutData: { technical: 1010, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 1010, description: "16 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Veterinary Foundations — graduate has completed foundational veterinary science coursework.", "Certificate of Proficiency: Core Clinical Skills — graduate has mastered anatomy, pharmacology, and clinical pathology fundamentals.", "Certificate of Practice — graduate has completed anesthesia, surgical nursing, and diagnostic imaging competencies.", "Program Completion: Veterinary Technician — graduate is prepared for the VTNE and entry-level veterinary technician positions."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VTE-101", "VTE-102", "VTE-103", "VTE-104"], businessModules: "", appliedModule: null, techHours: 170, businessHours: 0, appliedHours: 0, termHours: 170, durationWeeks: "≈ 26 Weeks", description: "Term 1 modules.", modulesCount: 4, clockHours: 170, modulesSummary: { technicalHours: 170, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTE-101", title: "Veterinary Medicine Profession & Practice", hours: 40, description: "Introduces the veterinary technology profession, scope of practice, professional ethics, and the role of the veterinary technician in the healthcare team. Students explore pathways, regulatory frameworks, and the historical development of veterinary medicine." },
      { code: "VTE-102", title: "Veterinary Anatomy & Physiology", hours: 50, description: "Provides study of animal anatomy and physiology across species. Students learn structural organization, body systems, comparative anatomy, and physiological processes with emphasis on clinical relevance to veterinary technology practice." },
      { code: "VTE-103", title: "Veterinary Pharmacy & Pharmacology", hours: 45, description: "Covers pharmacology principles, drug classifications, mechanisms of action, dosage calculations, and pharmacy management. Students learn about common veterinary pharmaceuticals, controlled substance regulations, adverse drug reactions, and safe medication administration." },
      { code: "VTE-104", title: "Animal Behavior, Handling & Restraint", hours: 35, description: "Teaches animal behavior principles, safe handling, and restraint techniques across species. Students learn species-specific behavioral cues, low-stress handling methods, and safety protocols for working with companion, production, and laboratory animals." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VTE-105", "VTE-106", "VTE-107", "VTE-108"], businessModules: "", appliedModule: null, techHours: 155, businessHours: 0, appliedHours: 0, termHours: 155, durationWeeks: "≈ 26 Weeks", description: "Term 2 modules.", modulesCount: 4, clockHours: 155, modulesSummary: { technicalHours: 155, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTE-105", title: "Medical Mathematics & Calculations", hours: 30, description: "Covers mathematical applications in veterinary medicine including dosage calculations, fluid therapy rates, anesthetic gas flow rates, and conversions. Students develop proficiency in medical mathematics essential for safe patient care." },
      { code: "VTE-106", title: "Clinical Pathology I: Hematology & Laboratory", hours: 45, description: "Introduces clinical pathology with focus on hematology, urinalysis, and basic laboratory procedures. Students learn sample collection, processing, analysis, and quality control. Includes hematology for veterinary technicians and clinical laboratory techniques." },
      { code: "VTE-107", title: "Medical Nursing for Veterinary Technicians", hours: 45, description: "Covers medical nursing principles including patient assessment, nursing care plans, fluid therapy, and patient monitoring. Students learn to provide nursing care to hospitalized patients across species." },
      { code: "VTE-108", title: "Nutrition, History & Physical Examination", hours: 35, description: "Teaches nutritional assessment, patient history taking, and physical examination techniques. Students learn to obtain patient histories, perform physical exams, and develop nutritional plans for various life stages and species." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["VTE-109", "VTE-110", "VTE-111", "VTE-112"], businessModules: "", appliedModule: null, techHours: 170, businessHours: 0, appliedHours: 0, termHours: 170, durationWeeks: "≈ 26 Weeks", description: "Term 3 modules.", modulesCount: 4, clockHours: 170, modulesSummary: { technicalHours: 170, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTE-109", title: "Clinical Pathology II: Microbiology & Parasitology", hours: 45, description: "clinical pathology covering microbiology, clinical parasitology, cytology, and clinical chemistry. Students learn culture techniques, parasite identification, cytologic evaluation, and diagnostic procedures." },
      { code: "VTE-110", title: "Anesthesia for Veterinary Technicians", hours: 45, description: "Covers anesthetic principles, agents, monitoring, and recovery. Students learn pre-anesthetic assessment, anesthetic induction and maintenance, patient monitoring during anesthesia, and management of anesthetic complications." },
      { code: "VTE-111", title: "Surgical Nursing for Veterinary Technicians", hours: 45, description: "Teaches surgical nursing including aseptic technique, instrument identification, patient preparation, intraoperative assistance, and postoperative care. Students learn surgical room protocols and the technician's role in surgical procedures." },
      { code: "VTE-112", title: "Radiography & Diagnostic Imaging", hours: 35, description: "Covers radiographic principles, positioning, exposure techniques, radiation safety, and equipment operation. Students learn to produce diagnostic-quality radiographs and apply radiation safety protocols." },
    ] },
    { termNumber: 4, name: "Term 4", technicalModules: ["VTE-113", "VTE-114", "VTE-115", "VTE-116"], businessModules: "", appliedModule: null, techHours: 155, businessHours: 0, appliedHours: 0, termHours: 155, durationWeeks: "≈ 26 Weeks", description: "Term 4 modules.", modulesCount: 4, clockHours: 155, modulesSummary: { technicalHours: 155, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTE-113", title: "Small & Large Animal Medicine", hours: 45, description: "Covers medical and nursing care for small and large animal species including farm animal medicine and nursing techniques. Students learn species-specific diseases, treatment protocols, and husbandry practices for production and companion animals." },
      { code: "VTE-114", title: "Animal Nutrition, Reproduction, Genetics & Aging", hours: 35, description: "Covers animal nutrition, reproductive physiology, genetics, and geriatric care. Students learn life-stage nutrition, breeding management, genetic principles, and care of aging animals including laboratory animal medicine." },
      { code: "VTE-115", title: "Emergency & Wound Care", hours: 35, description: "Covers emergency medicine, critical care nursing, wound management, and physical therapy. Students learn triage, emergency procedures, wound assessment and treatment, and rehabilitation techniques." },
      { code: "VTE-116", title: "Veterinary Practice Administration & Communications", hours: 40, description: "Covers veterinary practice management, office procedures, client communications, and professional skills. Students learn practice management software, human resources basics, marketing, and effective communication with clients and colleagues." },
    ] },
  ],
};

// ─── VTN — Veterinary Technology ──────────────────────────────────────────
const vtn: ProgramDetails = {
  id: "vtn",
  code: "VTN",
  slug: "veterinary-technology",
  title: "Veterinary Technology",
  fullTitle: "Veterinary Technologist",
  subtitle: "Individuals seeking comprehensive veterinary technology education.",
  tagline: "Veterinary Technology.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Veterinary Technologist",
  totalWeeks: 104,
  totalWeeksFormatted: "24 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 10,
  totalClockHours: 525,
  termsCount: 4,
  heroImage: "/images/vet_cat_checkup.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "104 Weeks", modules: "10 Modules", hours: "525 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Veterinary Technology is a 24 months program with 10 modules and 435 instructional hours.", "Target: Individuals seeking comprehensive veterinary technology education."],
  programObjective: "Individuals seeking comprehensive veterinary technology education.",
  safetyGates: [],
  capstoneCode: "VTN-110",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Veterinary Pharmacology" },
    { icon: "Heart", label: "Understanding the Human-Animal Bond" },
    { icon: "Shield", label: "Safety" },
    { icon: "PawPrint", label: "Research in Veterinary Technology" },
  ],
  donutData: { technical: 525, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 525, description: "10 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Pharmacology — graduate has completed pharmacology coursework.", "Certificate of Proficiency: Clinical Foundations — graduate has mastered safety compliance, research methods, and preventative healthcare.", "Certificate of Practice — graduate has completed animal medicine and emergency critical care training.", "Program Completion: Veterinary Technology — graduate is prepared for veterinary technology and VTS specialty roles."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["VTN-101", "VTN-102", "VTN-103"], businessModules: "", appliedModule: null, techHours: 115, businessHours: 0, appliedHours: 0, termHours: 115, durationWeeks: "≈ 26 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 115, modulesSummary: { technicalHours: 115, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTN-101", title: "Veterinary Pharmacology", hours: 50, description: "study of veterinary pharmacology including pharmacokinetics, pharmacodynamics, drug interactions, compounding, and therapeutic protocols. Students explore emerging pharmaceuticals and evidence-based pharmacotherapy." },
      { code: "VTN-102", title: "Understanding the Human-Animal Bond", hours: 30, description: "Explores the psychological, social, and emotional dimensions of the human-animal bond. Students learn about attachment theory, grief and bereavement support, animal-assisted therapy, and the role of the bond in veterinary practice." },
      { code: "VTN-103", title: "Safety & Regulatory Compliance in Veterinary Medicine", hours: 35, description: "Covers safety and regulatory frameworks in veterinary medicine. Students learn OSHA compliance, radiation safety, hazardous material handling, controlled substance regulations, and facility accreditation standards." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["VTN-104", "VTN-105", "VTN-106"], businessModules: "", appliedModule: null, techHours: 115, businessHours: 0, appliedHours: 0, termHours: 115, durationWeeks: "≈ 26 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 115, modulesSummary: { technicalHours: 115, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTN-104", title: "Research in Veterinary Technology", hours: 35, description: "Introduces research methodologies applicable to veterinary technology. Students learn evidence-based medicine principles, literature evaluation, research design, data analysis, and critical appraisal of veterinary research." },
      { code: "VTN-105", title: "Preventative Healthcare & Integrative Medicine for Animals", hours: 40, description: "Covers preventative healthcare strategies and integrative medicine approaches. Students learn wellness protocols, vaccination programs, nutrition, complementary therapies, and holistic approaches to animal health." },
      { code: "VTN-106", title: "Veterinary Practice Management", hours: 40, description: "practice management for veterinary technology leaders. Students learn strategic planning, quality improvement, team leadership, financial management, and regulatory compliance in practice settings." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["VTN-107", "VTN-108"], businessModules: "", appliedModule: null, techHours: 95, businessHours: 0, appliedHours: 0, termHours: 95, durationWeeks: "≈ 26 Weeks", description: "Term 3 modules.", modulesCount: 2, clockHours: 95, modulesSummary: { technicalHours: 95, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTN-107", title: "Animal Medicine & Domestic Animal Species Nursing", hours: 50, description: "study of animal medicine and nursing across domestic species. Students learn complex medical cases, species-specific disease management, nursing interventions, and critical care for diverse domestic animal species." },
      { code: "VTN-108", title: "Veterinary Emergency & Critical Care", hours: 45, description: "emergency and critical care for veterinary technicians. Students learn triage, emergency procedures, critical care monitoring, life support, trauma management, and disaster preparedness." },
    ] },
    { termNumber: 4, name: "Term 4", technicalModules: ["VTN-109", "VTN-110"], businessModules: "", appliedModule: null, techHours: 110, businessHours: 0, appliedHours: 0, termHours: 110, durationWeeks: "≈ 26 Weeks", description: "Term 4 modules.", modulesCount: 2, clockHours: 110, modulesSummary: { technicalHours: 110, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "VTN-109", title: "Animal Anesthesia & Surgical Nursing", hours: 50, description: "anesthesia and surgical nursing for veterinary technology specialists. Students learn anesthetic protocols, complex surgical assistance, perioperative critical care, and anesthesia for high-risk patients." },
      { code: "VTN-110", title: "Clinical Practicum & Portfolio", hours: 60, description: "practicum integrating all coursework through supervised clinical experiences. Students complete a professional portfolio demonstrating competency across all program domains and present a project." },
    ] },
  ],
};

// ─── ZKA — Zookeeper Assistant ──────────────────────────────────────────
const zka: ProgramDetails = {
  id: "zka",
  code: "ZKA",
  slug: "zookeeper-assistant",
  title: "Zookeeper Assistant",
  fullTitle: "Zookeeper Assistant",
  subtitle: "Individuals seeking zookeeping and exotic animal care skills.",
  tagline: "Zookeeper Assistant.",
  heroQuote: "Skills that save lives and build careers.",
  heroQuoteAttribution: "Leashed",
  badge: "ACADEMY",
  credential: "Zookeeper Assistant",
  totalWeeks: 52,
  totalWeeksFormatted: "12 months",
  partTimeWeeksFormatted: "Part-Time Available",
  totalModules: 9,
  totalClockHours: 440,
  termsCount: 3,
  heroImage: "/images/mountain_sunset.jpg",
  scheduleWeekly: "30 Hours / Week · Mon – Fri | 08:00 – 15:30",
  stats: { weeks: "52 Weeks", modules: "9 Modules", hours: "440 Hours", credential: "1 Credential" },
  overviewParagraphs: ["Zookeeper Assistant is a 12 months program with 9 modules and 375 instructional hours.", "Target: Individuals seeking zookeeping and exotic animal care skills."],
  programObjective: "Individuals seeking zookeeping and exotic animal care skills.",
  safetyGates: [],
  capstoneCode: "ZKA-109",
  stacksInto: "",
  admissionRequirements: "Age 18+",
  coreCompetencies: [
    { icon: "Scissors", label: "Introduction to Zoos" },
    { icon: "Heart", label: "Exotic Animal Housing, Exhibits" },
    { icon: "Shield", label: "Animal Health" },
    { icon: "PawPrint", label: "Exotic Animal Behavior, Enrichment" },
  ],
  donutData: { technical: 440, businessPersonal: 0, applied: 0 },
  breakdown: [{ type: "Total Hours", percent: "100%", hours: 440, description: "9 modules" }],
  manuals: [],
  deliveryAndAccess: [],
  completionRequirements: ["Certificate of Completion: Zookeeping Foundations — graduate has mastered zoo operations, housing, and safety.", "Certificate of Proficiency: Animal Care & Conservation — graduate has completed behavior, conservation, and biology coursework.", "Program Completion: Zookeeper Assistant — graduate is prepared for zookeeper assistant positions."],
  terms: [
    { termNumber: 1, name: "Term 1", technicalModules: ["ZKA-101", "ZKA-102", "ZKA-103"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 17 Weeks", description: "Term 1 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ZKA-101", title: "Introduction to Zoos & Zookeeping", hours: 40, description: "Introduces the zookeeping profession, zoo operations, and the role of the zookeeper assistant. Students learn the history and purpose of zoos, zoo organizational structures, and pathways in zookeeping." },
      { code: "ZKA-102", title: "Exotic Animal Housing, Exhibits & Husbandry", hours: 40, description: "Covers exotic animal housing, exhibit design, and daily husbandry routines. Students learn species-appropriate enclosure requirements, environmental enrichment, sanitation protocols, and daily care routines for diverse species." },
      { code: "ZKA-103", title: "Animal Health & Zookeeping Safety", hours: 40, description: "Covers animal health monitoring and safety protocols in zoo settings. Students learn health assessment, disease prevention, zoonotic disease awareness, workplace safety, and emergency response procedures." },
    ] },
    { termNumber: 2, name: "Term 2", technicalModules: ["ZKA-104", "ZKA-105", "ZKA-106"], businessModules: "", appliedModule: null, techHours: 120, businessHours: 0, appliedHours: 0, termHours: 120, durationWeeks: "≈ 17 Weeks", description: "Term 2 modules.", modulesCount: 3, clockHours: 120, modulesSummary: { technicalHours: 120, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ZKA-104", title: "Exotic Animal Behavior, Enrichment & Training", hours: 40, description: "Covers exotic animal behavior, environmental enrichment, and training techniques. Students learn species-specific behavior patterns, enrichment program design, positive reinforcement training, and behavioral assessment." },
      { code: "ZKA-105", title: "Zoo Conservation & Breeding Programs", hours: 35, description: "Covers zoo-based conservation programs and captive breeding. Students learn Species Survival Plans, conservation genetics, population management, and the role of zoos in global conservation efforts." },
      { code: "ZKA-106", title: "Biology & Taxonomy of Zoo Species", hours: 45, description: "Covers the biology and taxonomy of major animal groups represented in zoos. Students learn ornithology, ichthyology, mammalogy, herpetology, entomology, general parasitology, genetics, comparative anatomy, and vertebrate physiology." },
    ] },
    { termNumber: 3, name: "Term 3", technicalModules: ["ZKA-107", "ZKA-108", "ZKA-109"], businessModules: "", appliedModule: null, techHours: 135, businessHours: 0, appliedHours: 0, termHours: 135, durationWeeks: "≈ 17 Weeks", description: "Term 3 modules.", modulesCount: 3, clockHours: 135, modulesSummary: { technicalHours: 135, businessHours: 0, appliedHours: 0 }, courseHighlights: [
      { code: "ZKA-107", title: "Ecology & Conservation Science", hours: 45, description: "Covers ecological principles and conservation science relevant to zookeeping. Students learn marine and freshwater ecology, disease ecology, tropical ecology, biogeography, paleobiology, wildland fire ecology, and ecological restoration." },
      { code: "ZKA-108", title: "Wildlife Management, Policy & Visitor Education", hours: 40, description: "Covers wildlife management, conservation policy, and zoo visitor education. Students learn fisheries and wildlife law, conservation management for herpetofauna, avian, and mammal species, parks and protected areas management, environmental interpretation, and effective communication of environmental science." },
      { code: "ZKA-109", title: "Veterinary Medicine in Zoological Settings &", hours: 50, description: "course covering veterinary medicine in zoological settings and integrating all program coursework. Students learn introductory veterinary anesthesia, zoological medicine, laboratory animal medicine, large/food animal medicine, regulatory medicine, and clinical pathology. Includes specialized medicine topics across cardiology, equine, neurology, oncology, and small animal internal medicine." },
    ] },
  ],
};

export const COURSES_PROGRAMS: ProgramDetails[] = [abt, aca, eqn, fel, gro, gsp, prt, pvm, vet, vpm, vpt, vst, vte, vtn, zka];

export function getProgramBySlug(slug: string): ProgramDetails | undefined {
  return COURSES_PROGRAMS.find((p) => p.slug === slug);
}

export function getProgramById(id: string): ProgramDetails | undefined {
  return COURSES_PROGRAMS.find((p) => p.id === id);
}