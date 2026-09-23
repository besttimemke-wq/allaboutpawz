// All About Pawz Academy — Leashed curriculum
// Authored from the Leashed Program Delivery Guide v1.0 (September 2026).
// Six integrated animal-care pathways. Each companion is the teaching surface
// the AI Professor grounds in, structured by the guide's four-term outline.

import type { Companion } from "./types";

type PathwaySeed = {
  code: string;
  title: string;
  credential: string;
  hours: number;
  weeks: number;
  accent: string;
  image: string;
  objective: string;
  level: string;
  deficiencyFocus: string | null;
  priority: string;
  terms: Array<{
    name: string;
    technical: string;
    modules: string;
    hours: string;
  }>;
  sections: Array<{
    title: string;
    lesson: string;
    workedExample: string;
    checks: string[];
  }>;
  practice: string[];
  capstone: { title: string; brief: string; deliverables: string[] };
  glossary: Array<{ term: string; definition: string }>;
};

// Shared business & personal mastery spine (LSH, PER, BUS, MKT, TEC, FIN, LEG)
// — appears in every pathway per the guide's term outlines.
const BUSINESS_OVERVIEW =
  "Every pathway shares the same Business & Personal Mastery spine: Life Skills & Health (LSH), Personal Readiness (PER), Business Operations (BUS), Marketing (MKT), Technology (TEC), Finance (FIN), and Legal (LEG). These modules run alongside your technical blocks so you graduate not just with craft skill but with the owner-operator foundation to run a compliant, profitable practice.";

const SEEDS: PathwaySeed[] = [
  // ─────────────────────────────────────── IPDG ──────────────────────────
  {
    code: "IPDG",
    title: "Professional Dog Groomer",
    credential: "Professional Dog Groomer Diploma",
    hours: 1248,
    weeks: 44,
    accent: "#187b65",
    image: "/leashed-assets/pathway-pdg.webp",
    level: "Diploma",
    deficiencyFocus: null,
    priority: "Low",
    objective:
      "Identify dog stages and understand dog life · Recognize breeds · Recognize grooming tools · Identify workplace safety · Provide basic and advanced grooming techniques · Provide handling and pet care · Understand sanitation · Provide supervised live-client salon services · Build, price, market and operate a grooming business · Manage personal readiness, finances and well-being as an owner · Provide CPR and first aid.",
    terms: [
      { name: "Term 1 — Foundation", technical: "IPDG-101–104", modules: "36 business & personal modules", hours: "311 hrs (≈11 wk)" },
      { name: "Term 2 — Core Skill", technical: "IPDG-201–204", modules: "36 business & personal modules", hours: "311 hrs (≈11 wk)" },
      { name: "Term 3 — Advanced Skill", technical: "IPDG-301–302", modules: "36 business & personal modules", hours: "346 hrs (≈12 wk)" },
      { name: "Term 4 — Capstone", technical: "IPDG-401–402", modules: "36 business & personal modules + GRM-BIZ", hours: "280 hrs (≈10 wk)" },
    ],
    sections: [
      {
        title: "Foundation — Dog Life, Breeds & Salon Safety",
        lesson:
          "You begin by learning to read the dog in front of you. Dogs move through life stages — puppy, adolescent, adult, senior — and each stage changes what grooming is safe and comfortable. You will learn to identify breed groups and coat types, because a Golden Retriever's double coat and a Poodle's curly coat demand different tools and techniques. Before you ever touch a dog, you master salon safety: how to lift and restrain without injury, how to read stress signals, and how to keep your station sanitary between dogs to prevent cross-contamination. IPDG-103 is a safety gate — you must be signed off before any live-animal work begins. This term also launches your Business & Personal Mastery spine: Life Skills, Personal Readiness, and the first Business and Marketing modules run alongside your technical blocks.",
        workedExample:
          "A senior dog with arthritis cannot stand for a full groom. You adapt: use a grooming sling or support strap, keep sessions shorter, pad the table, and schedule rest breaks. Reading the life stage changes the entire grooming plan — not just the haircut.",
        checks: [
          "Name the five AKC breed groups and give one coat-type characteristic of each.",
          "What three stress signals should you watch for before beginning a groom, and what does each tell you to do?",
          "Describe your sanitation sequence between dogs. Why does order matter?",
        ],
      },
      {
        title: "Core Skill — Bathing, Drying & Prep Technique",
        lesson:
          "Term 2 moves into the craft. You learn the prep work that determines whether a finished groom looks professional or rushed: brushing out the coat, checking for matting, trimming nails, cleaning ears, and expressing anal glands when appropriate. Bathing technique is not just soap and water — it is choosing the right shampoo for the coat and skin condition, controlling water temperature, and working product through to the skin. Drying is where groomers earn their reputation: a high-velocity dryer removes loose coat and straightens hair for a smooth finish, but it requires skill to avoid tangling or frightening the dog. You will practice these techniques on mannequins and supervised models before advancing to live-client dogs.",
        workedExample:
          "A matted Goldendoodle arrives. Options: shave the mats out (fastest, shortest coat), or brush-bathe-dry and demat (preserves coat length but may be painful). You assess mat severity, the dog's tolerance, and the owner's preference before choosing. There is no single right answer — there is the right answer for this dog today.",
        checks: [
          "Walk through your prep sequence before bathing. What happens if you skip brushing?",
          "When would you choose a high-velocity dryer versus a stand dryer, and why?",
          "A dog has mild matting behind the ears. Describe your approach and your reasoning.",
        ],
      },
      {
        title: "Advanced Skill — Breed Profiles & Scissoring",
        lesson:
          "Term 3 is where grooming becomes a craft. You learn breed-standard cuts — the Poodle puppy cut, the Schnauzer pattern, the Cocker profile — and the scissoring and clipper techniques that produce them. Scissoring is a skill built over hundreds of hours: you learn to hold the scissors correctly, to follow the dog's natural lines, and to blend so the cut looks seamless. IPDG-302 is a safety gate; you must be signed off before advanced live-animal work. You also begin supervised live-client salon services this term, applying your technique to real dogs with real owners. Every live-client dog is graded against the Competency Rubric, and safety-critical rows are pass/fail.",
        workedExample:
          "A client wants a 'puppy cut' on their 6-month-old Labradoodle. There is no breed standard for a Doodle, so you negotiate: you show reference photos, agree on a length, and confirm the face and tail style. The consultation is part of the craft — a mismatched expectation is a failed groom even if the technique is perfect.",
        checks: [
          "What is the difference between a guard comb length and a snap-on comb? When would you use each?",
          "Describe the scissoring blend technique. Why do you blend rather than cut to a line?",
          "A live-client dog is stressed and pulling away during a face trim. What is your protocol?",
        ],
      },
      {
        title: "Capstone — Live Salon & Business Launch",
        lesson:
          "Term 4 is your capstone. You run the salon floor under instructor supervision: booking clients, greeting, consulting, grooming, and checking out — the full owner-operator cycle. The GRM-BIZ capstone is a panel review where you present your business plan: your service menu and pricing, your marketing strategy, your cost structure, and your first-year financial projection. You must demonstrate competency on every row of the rubric. Your practicum log — signed by your instructor — records the live-client hours and dog variety required for credential issue. By graduation you hold a Professional Dog Groomer Diploma and the business foundation to open your own salon or enter the workforce as a lead groomer.",
        workedExample:
          "Your capstone business plan: a home-based grooming salon serving 8 dogs per week at $65 average ticket. Revenue: $2,080/wk. Costs: supplies, insurance, equipment amortization, marketing — roughly $650/wk. Net: $1,430/wk before taxes. The panel tests whether your numbers are realistic and whether you can defend them.",
        checks: [
          "Present your service menu and pricing. How did you set your prices?",
          "A client is unhappy with their groom. Walk through your resolution protocol.",
          "What does your practicum log need to show before your credential is issued?",
        ],
      },
    ],
    practice: [
      "Diagram a dog's life stages and note one grooming adaptation for each.",
      "Match five coat types to the correct shampoo and drying technique.",
      "Write your sanitation sequence as a checklist a new assistant could follow.",
      "Practice the prep sequence on a mannequin: brush, nails, ears, bath, dry.",
      "Sketch a breed-standard outline for a breed of your choice and label the clipper lengths.",
      "Write a consultation script for a first-time client with a matted dog.",
      "Draft a one-page service menu with prices for a home grooming salon.",
      "Calculate the break-even number of dogs per week for a salon with $1,200 weekly fixed costs and a $35 per-dog contribution margin.",
    ],
    capstone: {
      title: "GRM-BIZ — Grooming Business Launch",
      brief:
        "Present a complete grooming business plan to an instructor panel: service menu and pricing, marketing strategy, 12-month financial projection, and a live-client practicum log demonstrating breed variety and hour minimums.",
      deliverables: [
        "A written business plan with menu, pricing, costs, and 12-month projection.",
        "A practicum log signed by your instructor showing the required live-client hours and breed variety.",
        "A live panel defense of your plan and a demonstration groom on a model dog.",
      ],
    },
    glossary: [
      { term: "Coat type", definition: "The texture and growth pattern of a dog's hair — smooth, double, curly, wire, or long — which determines grooming technique." },
      { term: "Safety gate", definition: "A module (e.g., IPDG-103) that must be signed off before live-animal work begins." },
      { term: "Sanitation sequence", definition: "The ordered cleaning of tools, table, and tub between dogs to prevent cross-contamination." },
      { term: "High-velocity dryer", definition: "A dryer that uses forceful air to remove loose coat and straighten hair for finishing." },
      { term: "Scissor-over-comb", definition: "A blending technique where scissors cut hair held by a comb, producing a smooth, natural line." },
      { term: "Competency Rubric", definition: "The evaluation standard; every row must reach Competent, and safety-critical rows are pass/fail." },
      { term: "Practicum log", definition: "The signed record of live-client hours and breed variety required for credential issue." },
      { term: "GRM-BIZ", definition: "The grooming business capstone reviewed by an instructor panel." },
    ],
  },

  // ─────────────────────────────────────── PDT ──────────────────────────
  {
    code: "PDT",
    title: "Professional Dog Trainer",
    credential: "Professional Dog Trainer Diploma",
    hours: 1112,
    weeks: 39,
    accent: "#956e29",
    image: "/leashed-assets/pathway-pdt.webp",
    level: "Diploma",
    deficiencyFocus: null,
    priority: "Low",
    objective:
      "Recognize/search dog history · Offer guidance to new owners · Follow vaccination & ADA guides · Identify 10 most important AKC breeds · Recognize training equipment · Recognize personalities & behavior problems · Choose effective solutions · Train basic obedience · Train advanced obedience · Use in-motion commands, verbal & hand signals · Make corrections · Design private classes · Build, price, market and operate a training business · Manage personal readiness, finances and well-being as an owner · Understand continuous education · Provide CPR and first aid.",
    terms: [
      { name: "Term 1 — Foundation", technical: "PDT-101–103", modules: "36 business & personal modules", hours: "256 hrs (≈9 wk)" },
      { name: "Term 2 — Core Skill", technical: "PDT-201–202", modules: "36 business & personal modules", hours: "266 hrs (≈9 wk)" },
      { name: "Term 3 — Advanced Skill", technical: "PDT-301–303", modules: "36 business & personal modules", hours: "336 hrs (≈12 wk)" },
      { name: "Term 4 — Capstone", technical: "PDT-401–402", modules: "36 business & personal modules + TRN-BIZ", hours: "254 hrs (≈9 wk)" },
    ],
    sections: [
      {
        title: "Foundation — Dog History, Breeds & Equipment",
        lesson:
          "You begin by understanding the dog as a species. Dogs descended from wolves through thousands of years of selective breeding, and that history explains why a Border Collie works differently than a Beagle. You will learn to identify the ten most important AKC breeds and their behavioral tendencies, because breed context shapes training approach. You will recognize training equipment — flat collars, martingales, slip leads, harnesses, long lines — and understand what each is for and when each is appropriate. You will also learn vaccination protocols and ADA service-animal guidelines, because a professional trainer must give new owners correct, legal, and safe guidance. PDT-201 is a safety gate before live-animal work.",
        workedExample:
          "A new owner asks whether a prong collar is right for their pulling Labrador. Rather than answering yes or no, you assess the dog's arousal level, the owner's handling skill, and the training goal. You explain the tool's purpose and risk, offer alternatives (front-clip harness, foundational loose-leash work), and let the owner decide with full information.",
        checks: [
          "Name three AKC breed groups and describe a typical behavioral tendency of each.",
          "When is a martingale collar preferable to a flat collar? Give a specific scenario.",
          "A client asks about service-animal registration. What does the ADA actually require, and what do you tell them?",
        ],
      },
      {
        title: "Core Skill — Basic Obedience & Marker Training",
        lesson:
          "Term 2 builds your core craft: marker-based training. You learn to use a marker — a clicker or a consistent verbal word — to tell the dog the exact moment it did the right thing, then follow with a reward. This is the foundation of modern, humane training. You will teach sit, down, stay, recall, and loose-leash walking using markers, shaping, and capturing. You will learn to read canine body language — calming signals, stress, arousal — so you can adjust your session before the dog shuts down or blows up. Corrections, when needed, are minimal and fair: a withheld reward, a reset, never fear or pain. PDT-201 is the safety gate you must pass before live-animal work begins.",
        workedExample:
          "Teaching recall: start in a low-distraction room. Mark and reward every time the dog comes to you. Add distance gradually. Add low distraction (a toy on the floor). Only when recall is reliable in five contexts do you take it outdoors on a long line. Rushing to outdoor recall before indoor fluency is the most common training failure.",
        checks: [
          "Explain the marker training cycle: what happens between the behavior and the reward?",
          "A dog is showing three calming signals during a session. What do you do, and why?",
          "Teach 'sit' using shaping. Describe the successive approximations you would mark.",
        ],
      },
      {
        title: "Advanced Skill — Behavior Problems & Private Classes",
        lesson:
          "Term 3 addresses the problems that bring owners to trainers: leash reactivity, resource guarding, separation anxiety, jumping, barking. You learn to distinguish a training problem (the dog doesn't know the behavior) from a behavior problem (the dog is in an emotional state that prevents learning). The approach is different: a training problem is solved with repetition; a behavior problem requires a behavior-modification plan that changes the dog's emotional response. You will also learn to design private classes — structuring a 6-week curriculum, setting measurable goals, and writing handouts owners can follow. This term includes supervised live-client training sessions on the training floor.",
        workedExample:
          "A dog barks and lunges at other dogs on leash (leash reactivity). This is a behavior problem, not a training problem — the dog is over-threshold emotionally. Your plan: management (increase distance), counter-conditioning (other dog appears → high-value treat → dog learns other dog predicts good things), and gradual exposure at the dog's pace. Punishing the bark suppresses the symptom and worsens the emotion.",
        checks: [
          "How do you tell whether a jumping dog has a training problem or a behavior problem?",
          "Design a 6-week private-class curriculum for a dog that pulls on leash. What is the measurable goal?",
          "A client's dog shows resource guarding around food. Outline your behavior-modification plan.",
        ],
      },
      {
        title: "Capstone — TRN-BIZ & Training Business Launch",
        lesson:
          "Term 4 is your capstone. You run supervised training sessions with live clients, building the practicum log required for credential issue. The TRN-BIZ capstone is a panel review where you present your training business plan: your class structure and pricing, your marketing channel (referrals, social media, vet partnerships), your insurance and liability waivers, and your continuing-education plan. Professional dog training requires lifelong learning — new methods, new research, new equipment — and your plan must show how you will stay current. By graduation you hold a Professional Dog Trainer Diploma and the business foundation to run private classes, group programs, or a training facility.",
        workedExample:
          "Your capstone business: private in-home training at $95 per session, 12 sessions per week. Revenue: $1,140/wk. Overhead: insurance, mileage, marketing — $300/wk. You also run one 6-week group class ($200/dog, 6 dogs) per month: $1,200/mo additional. The panel tests whether your volume assumptions are realistic and whether your liability protections are adequate.",
        checks: [
          "Present your class pricing and volume assumptions. Can you defend the numbers?",
          "What liability protections does your business require, and why?",
          "Describe your continuing-education plan for the next two years.",
        ],
      },
    ],
    practice: [
      "Write a breed-behavior reference card for five AKC breed groups.",
      "Diagram the marker-training cycle and label each step.",
      "Practice timing: mark a behavior (using a clicker or word) within half a second. Test your timing with a video.",
      "Write a 6-week loose-leash walking curriculum with a measurable weekly goal.",
      "Role-play a consultation with an owner whose dog has leash reactivity. Write your intake questions.",
      "Draft a behavior-modification plan for separation anxiety. List management, counter-conditioning, and gradual exposure steps.",
      "Design a private-class pricing sheet and a group-class structure.",
      "Write a liability waiver for a group training class.",
    ],
    capstone: {
      title: "TRN-BIZ — Training Business Launch",
      brief:
        "Present a complete training business plan to an instructor panel: class structure and pricing, marketing strategy, insurance and liability framework, continuing-education plan, and a live-client practicum log.",
      deliverables: [
        "A written business plan with class menu, pricing, marketing, and 12-month projection.",
        "A practicum log signed by your instructor showing required live-client training hours.",
        "A live panel defense including a demonstration training session with a client dog.",
      ],
    },
    glossary: [
      { term: "Marker", definition: "A signal (clicker or word) that tells the dog the exact moment it performed the correct behavior." },
      { term: "Shaping", definition: "Training a behavior in successive approximations, marking and rewarding each step closer to the goal." },
      { term: "Threshold", definition: "The distance or intensity at which a dog tips from able-to-learn into reactive or shut-down." },
      { term: "Calming signals", definition: "Subtle body-language cues (lip-licking, yawning, turning away) a dog uses to communicate stress or desire to de-escalate." },
      { term: "Counter-conditioning", definition: "Changing a dog's emotional response by pairing the trigger with something the dog loves." },
      { term: "Reactivity", definition: "An over-threshold emotional response — barking, lunging — usually driven by fear or frustration, not aggression." },
      { term: "Safety gate", definition: "A module (e.g., PDT-201) that must be signed off before live-animal work begins." },
      { term: "TRN-BIZ", definition: "The training business capstone reviewed by an instructor panel." },
    ],
  },

  // ─────────────────────────────────────── ACA ──────────────────────────
  {
    code: "ACA",
    title: "Animal Care Assistant",
    credential: "Dog Bather–Animal Care Assistant Diploma",
    hours: 988,
    weeks: 35,
    accent: "#547590",
    image: "/leashed-assets/pathway-db.webp",
    level: "Diploma",
    deficiencyFocus: null,
    priority: "Low",
    objective:
      "Identify a puppy and understand puppy life · Recognize breeds · Recognize grooming tools · Identify workplace safety · Provide basic handling and basic dog care · Understand sanitation process · Enter the workforce with personal readiness and customer-service skills · Understand the bather-to-owner career ladder.",
    terms: [
      { name: "Term 1 — Foundation", technical: "ACA-101–103", modules: "36 business & personal modules", hours: "248 hrs (≈9 wk)" },
      { name: "Term 2 — Core Skill", technical: "ACA-201", modules: "36 business & personal modules", hours: "246 hrs (≈9 wk)" },
      { name: "Term 3 — Advanced Skill", technical: "ACA-301", modules: "36 business & personal modules", hours: "266 hrs (≈9 wk)" },
      { name: "Term 4 — Capstone", technical: "—", modules: "36 business & personal modules + ACA-BIZ", hours: "228 hrs (≈8 wk)" },
    ],
    sections: [
      {
        title: "Foundation — Puppies, Breeds & Workplace Safety",
        lesson:
          "You begin by learning to care for dogs at the most fundamental level: feeding, watering, exercising, and monitoring. You will learn to identify puppy developmental stages — because a 10-week-old puppy needs different handling than a 3-year-old adult — and to recognize breed characteristics that affect care. Workplace safety is your first gate: you learn to lift, hold, and move dogs without injury to yourself or the animal, to read stress and fear signals, and to maintain a clean, sanitary kennel and bathing area. ACA-201 is a safety gate that must be signed off before live-animal work. This pathway is the fastest entry into the animal-care workforce and the foundation of the bather-to-owner career ladder.",
        workedExample:
          "A boarding dog stops eating on day two. A trained Animal Care Assistant notices, checks the dog's water intake and elimination, documents the change, and reports it to the supervisor — rather than assuming the dog is 'just nervous.' Early observation is the core skill of animal care.",
        checks: [
          "Name three puppy developmental stages and one handling consideration for each.",
          "What are five things you check during a routine kennel walk-through?",
          "Describe your hand-washing and sanitation protocol between handling dogs.",
        ],
      },
      {
        title: "Core Skill — Handling, Bathing & Basic Grooming Prep",
        lesson:
          "Term 2 builds your hands-on craft. You learn to safely restrain a dog for bathing, nail trims, and ear cleaning — the bather's daily work. You will bathe dogs of different sizes and temperaments, learning to choose the right shampoo, control water temperature, and dry safely. You will trim nails without cutting the quick, clean ears without damaging the canal, and express anal glands when appropriate and permitted. ACA-201 is the safety gate this term: you must be signed off before any live-animal bathing work. The goal is not just to perform these tasks but to perform them calmly and humanely, so the dog leaves the experience trusting people, not fearing them.",
        workedExample:
          "A 90-pound Lab panics when the dryer turns on. You do not force it. You introduce the dryer at a distance, feed treats, move it closer over several sessions. The dog learns the dryer is safe. Forcing the dog would create a lifelong dryer phobia — and a dog that bites the next groomer who tries.",
        checks: [
          "Walk through your bathing setup: water temperature, shampoo selection, and the order of operations.",
          "How do you trim a black nail safely when you cannot see the quick?",
          "A dog is fearful of the dryer. Describe your desensitization plan.",
        ],
      },
      {
        title: "Advanced Skill — Kennel Operations & Customer Service",
        lesson:
          "Term 3 moves beyond individual dog handling to the operations of a kennel, salon, or veterinary office. You will learn intake and checkout procedures, vaccination record-keeping, medication administration, and how to communicate with pet owners — the customer-service dimension that separates a good assistant from a great one. You will manage multiple dogs simultaneously: feeding schedules, exercise rotation, sanitation cycles, and behavioral monitoring. You will also learn the business modules that every owner-operator needs: scheduling, invoicing, and client communication. This is the term where you begin to see the career ladder — from bather to senior assistant to salon manager to owner.",
        workedExample:
          "A client drops off a dog and mentions it 'sometimes doesn't eat.' You log the note, watch the dog, and when it skips two meals you call the client and suggest a vet check. The client is impressed that you paid attention. That kind of service builds the trust that fills a salon's schedule.",
        checks: [
          "Describe your intake checklist for a new boarding or grooming client.",
          "A dog needs medication twice daily. How do you document and administer it?",
          "Role-play a checkout call: the dog was anxious during grooming. How do you communicate this honestly?",
        ],
      },
      {
        title: "Capstone — ACA-BIZ & Workforce Readiness",
        lesson:
          "Term 4 is your capstone. Unlike the longer pathways, ACA does not have a technical module in Term 4 — the focus is entirely on business readiness and the ACA-BIZ capstone. You present your workforce-readiness portfolio to an instructor panel: your resume, your practicum log showing live-animal hours, your customer-service philosophy, and your career plan (entering the workforce as a bather/assistant, with a timeline for advancement). The ACA pathway stacks into IPDG — your technical modules (ACA-101–103, 201, 301) are credited toward IPDG-101–204, and all business modules transfer. Many graduates start here, enter the workforce, and return for the full grooming diploma.",
        workedExample:
          "Your capstone career plan: 'I will start as a bather at a high-volume salon, building speed and breed exposure. In 12 months I will enroll in IPDG Term 3 to add scissoring and breed profiles. In 24 months I will be a lead groomer. In 5 years I will open my own salon.' The panel tests whether this timeline is realistic and whether your practicum log supports it.",
        checks: [
          "Present your workforce-readiness portfolio. What does your practicum log show?",
          "How do your ACA modules stack into the IPDG pathway? Be specific.",
          "Describe your 5-year career plan from bather to owner. What are the milestones?",
        ],
      },
    ],
    practice: [
      "Write a daily care log template for a boarding dog: feeding, water, elimination, behavior.",
      "Create a breed-reference card for five common breeds with coat and temperament notes.",
      "Practice the sanitary wash sequence: hands, tools, table, tub, floor — in what order?",
      "Write a desensitization plan for a dog fearful of nail trims.",
      "Draft an intake form for a new grooming client with all required fields.",
      "Role-play a phone call: a client wants to book but their dog has never been groomed. What do you ask?",
      "Write your customer-service philosophy in one paragraph.",
      "Map your ACA modules to the IPDG pathway. Which modules transfer and which don't?",
    ],
    capstone: {
      title: "ACA-BIZ — Workforce Readiness Portfolio",
      brief:
        "Present a workforce-readiness portfolio to an instructor panel: resume, signed practicum log, customer-service philosophy, and a career plan showing the bather-to-owner ladder with milestones.",
      deliverables: [
        "A resume and practicum log demonstrating live-animal hours and breed variety.",
        "A written customer-service philosophy and career plan with 1-, 3-, and 5-year milestones.",
        "A live panel defense including a demonstration bathing and handling session.",
      ],
    },
    glossary: [
      { term: "Quick", definition: "The blood vessel and nerve inside a dog's nail; cutting it causes pain and bleeding." },
      { term: "Intake", definition: "The check-in process for a new client: vaccination records, behavior history, owner instructions." },
      { term: "Sanitation cycle", definition: "The sequence of cleaning between dogs: tools, surfaces, tub, floor." },
      { term: "Safety gate", definition: "A module (e.g., ACA-201) that must be signed off before live-animal work begins." },
      { term: "Career ladder", definition: "The progression from bather to assistant to groomer to manager to owner." },
      { term: "Stacking", definition: "Credit transfer between pathways — ACA modules count toward IPDG." },
      { term: "Practicum log", definition: "The signed record of live-animal hours required for credential issue." },
      { term: "ACA-BIZ", definition: "The Animal Care Assistant capstone reviewed by an instructor panel." },
    ],
  },

  // ─────────────────────────────────────── PPS ──────────────────────────
  {
    code: "PPS",
    title: "Professional Pet Sitter",
    credential: "Pet Sitter Certificate",
    hours: 56,
    weeks: 2,
    accent: "#7761a6",
    image: "/leashed-assets/pathway-sit.webp",
    level: "Certificate",
    deficiencyFocus: "Client intake & multi-species care protocols",
    priority: "Medium",
    objective:
      "Introduce and choose appropriate clients · Provide multi-species pet care · Handle pets and sanitation safely · Provide CPR and first aid · Launch and run a compliant, insured pet-sitting business.",
    terms: [
      { name: "Term 1 — Foundation", technical: "PPS-101, 102, 104, 105", modules: "BUS-101, FIN-101, LEG-101, LEG-103", hours: "38 hrs (≈2 wk)" },
      { name: "Term 2 — Core Skill", technical: "—", modules: "BUS-203", hours: "6 hrs (≈1 day)" },
      { name: "Term 3 — Advanced Skill", technical: "—", modules: "MKT-304", hours: "6 hrs (≈1 day)" },
      { name: "Term 4 — Capstone", technical: "—", modules: "PPS-BIZ", hours: "6 hrs (≈1 day)" },
    ],
    sections: [
      {
        title: "Foundation — Client Selection & Multi-Species Care",
        lesson:
          "Pet sitting is a short, intense pathway — 56 hours over two weeks — but it covers the essentials of in-home animal care. You begin by learning to choose appropriate clients: how to conduct an intake interview, assess the pet's needs and temperament, and decide whether the sit is a good fit (not every sitter is right for every pet). You will learn multi-species care: dogs, cats, small mammals, birds, and reptiles each have different feeding, handling, and sanitation requirements. PPS-104 and PPS-105 are safety gates that must be signed off before live-animal work. You will also learn CPR and first aid — the skill that makes a professional sitter more valuable than a neighbor.",
        workedExample:
          "An intake interview reveals the client's dog has separation anxiety and has destroyed a door frame. You decide: take the sit with a crate-training management plan, or refer to a trainer first and take the sit later. The professional choice is not always to take the job — it is to take the job you can do well.",
        checks: [
          "List five questions you must ask during a pet-sitting intake interview.",
          "Compare the daily care requirements of a dog versus a cat. What differs?",
          "PPS-104 and PPS-105 are safety gates. What do they cover, and why must they be signed off first?",
        ],
      },
      {
        title: "Core Skill — Safe Handling & Sanitation",
        lesson:
          "This short section focuses on the physical craft of pet sitting: entering a home safely, approaching and handling a pet you may not know well, managing feeding and medication schedules, and maintaining sanitation (waste disposal, food bowls, litter boxes). You will learn to read an animal's body language on first meeting — is this dog welcoming or warning? — and to adjust your approach. You will also learn the business essentials: scheduling, invoicing, and the legal basics (LEG-101, LEG-103) of entering someone's home and caring for their property and pet.",
        workedExample:
          "You arrive for a sit and the dog is loose in the yard, not crated as the client said. You do not chase. You sit down, avoid eye contact, let the dog approach. Once the dog sniffs you and relaxes, you attach the leash. Forcing contact with an unfamiliar loose dog is how sitters get bitten.",
        checks: [
          "Describe your first-meeting protocol with an unfamiliar dog in a client's home.",
          "A cat needs liquid medication twice daily. Walk through your administration and documentation.",
          "What legal protections should your pet-sitting contract include?",
        ],
      },
      {
        title: "Advanced Skill — Marketing & Business Operations",
        lesson:
          "Even a 2-week certificate includes the business foundation. BUS-203 covers scheduling and invoicing systems; MKT-304 covers marketing — how to build a client base through referrals, vet partnerships, and online presence. You will learn about insurance (critical for in-home work), bonding, and the pricing models pet sitters use: per-visit, per-day, or overnight. The goal is not just to sit pets but to run a compliant, insured business that can grow.",
        workedExample:
          "Your pricing model: $25 per 30-minute visit, $45 per overnight. A typical client with two dogs needs three visits per day: $75/day. Over a 5-day trip: $375. Your insurance: $300/year. One client per month covers insurance; the rest is revenue. The numbers must work before you take the first sit.",
        checks: [
          "Compare per-visit versus overnight pricing. When is each appropriate?",
          "What insurance and bonding does a professional pet sitter need, and why?",
          "Draft a one-paragraph marketing plan to get your first five clients.",
        ],
      },
      {
        title: "Capstone — PPS-BIZ & Pet-Sitting Business Launch",
        lesson:
          "Your capstone is the PPS-BIZ portfolio: a complete pet-sitting business launch in miniature. You present your service menu and pricing, your intake and contract templates, your insurance plan, and your marketing strategy. Because this pathway is short, the capstone is less about a practicum log and more about whether your business is ready to take its first real client safely and legally. PPS stacks into ACA, IPDG, PDT, or PPC — your modules transfer if you choose to continue. Many graduates start here, launch a sitting business, and return for a longer pathway later.",
        workedExample:
          "Your capstone: a pet-sitting business serving a 5-mile radius, $25/visit, insured and bonded, with a contract template and intake form ready. Your first client is a neighbor's dog. The panel tests whether your paperwork is complete and your pricing is sustainable.",
        checks: [
          "Present your service menu, pricing, and contract template.",
          "How do your PPS modules stack into longer pathways? Which ones transfer?",
          "What would make you decline a pet-sitting client? Give two examples.",
        ],
      },
    ],
    practice: [
      "Write an intake interview questionnaire with at least 10 questions.",
      "Create a daily care checklist for a sit with one dog and one cat.",
      "Draft a pet-sitting contract template covering liability, payment, and emergency authorization.",
      "Calculate your break-even number of sits per month with $300/month insurance and $25/visit revenue.",
      "Write a first-meeting protocol for an unfamiliar cat in a client's home.",
      "Research and list the insurance and bonding requirements for pet sitters in your state.",
      "Draft a marketing plan to get your first five clients in 30 days.",
      "Map your PPS modules to one longer pathway (ACA, IPDG, PDT, or PPC).",
    ],
    capstone: {
      title: "PPS-BIZ — Pet-Sitting Business Launch",
      brief:
        "Present a complete pet-sitting business launch: service menu, pricing, intake and contract templates, insurance plan, and marketing strategy. The panel tests whether your business is ready to take its first real client.",
      deliverables: [
        "A service menu with pricing and a contract template.",
        "An intake questionnaire and a daily-care checklist.",
        "A marketing plan and a 30-day client-acquisition goal.",
      ],
    },
    glossary: [
      { term: "Intake interview", definition: "The pre-sit consultation where you assess the pet's needs and decide whether to take the job." },
      { term: "Safety gate", definition: "A module (PPS-104, PPS-105) that must be signed off before live-animal work." },
      { term: "Bonding", definition: "Insurance that protects the client against theft by the sitter — essential for in-home work." },
      { term: "Per-visit pricing", definition: "Charging a flat rate per visit rather than per day or overnight." },
      { term: "Stacking", definition: "Credit transfer — PPS modules count toward ACA, IPDG, PDT, or PPC." },
      { term: "PPS-BIZ", definition: "The pet-sitting capstone reviewed by an instructor panel." },
      { term: "CPR/First Aid", definition: "Emergency care certification that distinguishes a professional sitter from an amateur." },
      { term: "Sanitation", definition: "Waste disposal, bowl cleaning, and litter management to keep the pet and home healthy." },
    ],
  },

  // ─────────────────────────────────────── CAT ──────────────────────────
  {
    code: "CAT",
    title: "Professional Cat Groomer",
    credential: "Professional Cat Groomer Certificate",
    hours: 58,
    weeks: 2,
    accent: "#b46545",
    image: "/leashed-assets/pathway-cat.webp",
    level: "Certificate",
    deficiencyFocus: "Cat temperament reading & safe handling",
    priority: "Medium",
    objective:
      "Recognize cat breeds · Read cat temperament and handle safely · Bathe and dry cats safely · Perform short, long and shave-down cat grooms · Add a profitable, safe cat-grooming service line to a business.",
    terms: [
      { name: "Term 1 — Foundation", technical: "CAT-101–104", modules: "BUS-101, FIN-101, LEG-101, LEG-103", hours: "40 hrs (≈2 wk)" },
      { name: "Term 2 — Core Skill", technical: "—", modules: "BUS-203", hours: "6 hrs (≈1 day)" },
      { name: "Term 3 — Advanced Skill", technical: "—", modules: "MKT-304", hours: "6 hrs (≈1 day)" },
      { name: "Term 4 — Capstone", technical: "—", modules: "CAT-BIZ", hours: "6 hrs (≈1 day)" },
    ],
    sections: [
      {
        title: "Foundation — Cat Breeds, Temperament & Safe Handling",
        lesson:
          "Cat grooming is a specialty skill — cats are not small dogs, and attempting to groom a cat with dog techniques is how groomers get bitten. You begin by learning cat breeds and coat types: short-haired, long-haired, and the hairless breeds. More important than breed is temperament: you will learn to read a cat's emotional state — relaxed, tense, overstimulated, fearful — and to adjust your handling before the cat escalates to a bite or scratch. CAT-102 is a safety gate that must be signed off before live-animal work. You will learn the 'less is more' philosophy: a cat groom may be shorter than a dog groom, and pushing past the cat's tolerance is both dangerous and unprofessional.",
        workedExample:
          "A long-haired cat arrives severely matted. The cat is hissing when touched. Options: sedation grooming (vet-referred), a shave-down in short sessions, or referral. You do not wrestle a cat through a dematting — you adapt the plan to the cat's tolerance. Cat grooming is as much about reading the cat as it is about the groom.",
        checks: [
          "Name three cat coat types and the grooming challenge of each.",
          "Describe three signs that a cat is approaching overstimulation. What do you do?",
          "CAT-102 is a safety gate. What does it cover, and why must it be signed off first?",
        ],
      },
      {
        title: "Core Skill — Bathing, Drying & Coat Types",
        lesson:
          "This section covers the physical craft of cat grooming. Most cats do not enjoy water, so bathing technique is about efficiency: warm (not hot) water, cat-safe shampoo, and a calm, firm hold. Drying is done with low-velocity air or towel-drying — a high-velocity dryer that works on dogs can terrify a cat. You will learn short-coat grooming (brush-out and nail trim), long-coat grooming (dematting, line brushing, and sanitary trim), and shave-down technique (using guards to remove matting safely). Nail trimming on a cat is different from a dog — you will learn the 'scruff and quick-clip' method and alternatives for cats who resist handling.",
        workedExample:
          "A Persian cat needs a full groom but will not tolerate water. You offer a 'lion cut' — a full-body shave-down leaving a mane and tail puff — done with clippers while the cat is calm, no bath required. The owner gets a manageable coat; the cat gets a stress-free groom. Flexibility is the cat groomer's core skill.",
        checks: [
          "Walk through your cat bathing setup. How does it differ from a dog bath?",
          "When would you recommend a lion cut versus a brush-out for a long-haired cat?",
          "Describe your nail-trim technique for a cat that resists having its paws handled.",
        ],
      },
      {
        title: "Advanced Skill — Shave-Downs & the Cat Grooming Business",
        lesson:
          "Cat grooming is one of the most profitable add-ons in the pet industry because few groomers will do it. This section covers the business case: how to price cat grooms (higher than dogs — the skill and risk premium), how to market cat services, and how to screen clients (some cats are not candidates for grooming without sedation, and a professional cat groomer knows when to refer to a vet). BUS-203 and MKT-304 give you the scheduling and marketing foundation to add cat grooming as a profitable service line to an existing salon or as a standalone specialty.",
        workedExample:
          "You add cat grooming to your salon at $85 per groom (vs. $65 for dogs). You do 4 cats per week: $340. The skill premium and the willingness to handle cats that other groomers refuse makes this your most profitable service line. The key is knowing your limits — a cat that needs sedation goes to the vet, not your table.",
        checks: [
          "How do you price cat grooms relative to dog grooms, and why?",
          "What screening criteria determine whether a cat is a candidate for grooming without sedation?",
          "Draft a one-paragraph marketing pitch for cat grooming services to existing dog-grooming clients.",
        ],
      },
      {
        title: "Capstone — CAT-BIZ & Service Line Launch",
        lesson:
          "Your capstone is the CAT-BIZ portfolio: a plan to add cat grooming as a profitable, safe service line. You present your pricing model, your client-screening protocol, your safety procedures (including when to refer to a vet), and your marketing plan. CAT stacks into IPDG or PPC — your technical modules (CAT-101–104) and the business modules transfer. For groomers who already hold an IPDG or ACA credential, this pathway adds a lucrative specialty. For new entrants, it is a fast path to a credential and a profitable niche.",
        workedExample:
          "Your capstone: adding cat grooming to an existing dog salon. Investment: cat-specific tools ($200), a separate cat room (minimal). Revenue: 4 cats/week at $85 = $340/week. The panel tests whether your screening protocol is safe and whether your pricing is sustainable.",
        checks: [
          "Present your cat-grooming service menu, pricing, and screening protocol.",
          "When do you refer a cat to a veterinarian for sedation grooming? Give three criteria.",
          "How does CAT stack into IPDG or PPC? Which modules transfer?",
        ],
      },
    ],
    practice: [
      "Create a cat breed and coat-type reference card for five common breeds.",
      "Write a temperament-assessment checklist for a cat arriving for its first groom.",
      "Diagram your cat bathing setup and compare it to your dog setup.",
      "Practice the 'less is more' principle: write a session plan that ends before the cat's tolerance runs out.",
      "Draft a pricing sheet for cat services: bath, brush-out, lion cut, nail trim, sanitary trim.",
      "Write a client-screening script: what do you ask before booking a cat groom?",
      "Create a referral criteria list for cats that need vet sedation.",
      "Map your CAT modules to the IPDG or PPC pathway.",
    ],
    capstone: {
      title: "CAT-BIZ — Cat Grooming Service Line Launch",
      brief:
        "Present a plan to add cat grooming as a profitable, safe service line: pricing model, client-screening protocol, safety procedures, vet-referral criteria, and marketing plan.",
      deliverables: [
        "A cat-service menu with pricing and a client-screening protocol.",
        "A safety procedures document including vet-referral criteria.",
        "A marketing plan targeting existing dog-grooming clients and cat-owner referrals.",
      ],
    },
    glossary: [
      { term: "Overstimulation", definition: "The emotional state where a cat tips from tolerating handling to biting or scratching; the cat groomer's primary safety concern." },
      { term: "Lion cut", definition: "A full-body shave-down leaving a mane and tail puff, often used for matted long-haired cats." },
      { term: "Shave-down", definition: "Using clippers with a guard to remove coat (often matting) to a uniform short length." },
      { term: "Safety gate", definition: "A module (CAT-102) that must be signed off before live-animal work." },
      { term: "Scruffing", definition: "Holding the loose skin at the back of a cat's neck for control — used judiciously, not as a default." },
      { term: "Skill premium", definition: "The higher price justified for cat grooming due to specialized skill and risk." },
      { term: "Stacking", definition: "Credit transfer — CAT modules count toward IPDG or PPC." },
      { term: "CAT-BIZ", definition: "The cat grooming capstone reviewed by an instructor panel." },
    ],
  },

  // ─────────────────────────────────────── PPC ──────────────────────────
  {
    code: "PPC",
    title: "Professional Pet Care & Business Ownership",
    credential: "Professional Pet Care & Business Ownership — Advanced Diploma",
    hours: 1500,
    weeks: 52,
    accent: "#19394b",
    image: "/leashed-assets/pathway-cpp.webp",
    level: "Advanced Diploma",
    deficiencyFocus: null,
    priority: "Low",
    objective:
      "All IPDG, PDT, PPS and CAT technical objectives · A multi-service practicum across salon floor, training floor and pet-sitting visits · Master the full Business & Personal Mastery spine (LSH, PER, BUS, MKT, TEC, FIN, LEG) · Launch, fund, staff, market, protect and scale a multi-service pet-care enterprise · Master personal life systems, finances and well-being as a whole-person owner · Provide CPR and first aid.",
    terms: [
      { name: "Term 1 — Foundation", technical: "PPC-101–106", modules: "36 business & personal modules", hours: "331 hrs (≈12 wk)" },
      { name: "Term 2 — Core Skill", technical: "PPC-201–205", modules: "36 business & personal modules", hours: "386 hrs (≈13 wk)" },
      { name: "Term 3 — Advanced Skill", technical: "PPC-301–306", modules: "36 business & personal modules", hours: "441 hrs (≈15 wk)" },
      { name: "Term 4 — Capstone", technical: "PPC-401–410", modules: "36 business & personal modules + PPC-BIZ", hours: "342 hrs (≈12 wk)" },
    ],
    sections: [
      {
        title: "Foundation — Multi-Service Craft & Owner Identity",
        lesson:
          "PPC is the terminal credential — the longest and most comprehensive pathway at 1,500 hours over 52 weeks. You begin by building identity as a multi-service owner: not just a groomer or a trainer, but an entrepreneur who will operate across salon, training, and sitting services. Term 1 covers the technical foundations of all three crafts (PPC-101–106) alongside the first tier of the Business & Personal Mastery spine. You study dog and cat grooming fundamentals, training theory, and pet-sitting operations — not yet at the depth of a single-pathway diploma, but at the breadth needed to manage a multi-service business. PPC-105 is a safety gate before live-animal work.",
        workedExample:
          "Your business vision: a 2,000 sq ft facility with 4 grooming stations, a training ring, and a boarding area. You will offer grooming, training classes, and overnight sitting — three revenue streams from one location. Term 1 is where you begin to build the craft foundation for all three and the business plan that ties them together.",
        checks: [
          "What does 'terminal credential' mean, and how does PPC differ from a single-pathway diploma?",
          "Describe your multi-service business vision. What services will you offer, and why those?",
          "PPC-105 is a safety gate. What does it cover, and why is it required before live-animal work?",
        ],
      },
      {
        title: "Core Skill — Scaling Craft Across Services",
        lesson:
          "Term 2 deepens your technical skill across all three service lines. You will practice advanced grooming techniques (breed profiles, scissoring), advanced training (behavior modification, group class design), and advanced sitting operations (multi-pet households, medication management, staff scheduling). The business modules this term cover operations at scale: hiring and managing staff, building standard operating procedures, and controlling costs across multiple service lines. The core insight is that a multi-service owner cannot be the best groomer, the best trainer, and the best sitter simultaneously — you must build systems and delegate while maintaining quality standards across each service.",
        workedExample:
          "You have 3 groomers, 2 trainers, and 4 sitters. Your Monday morning: the lead groomer calls in sick, a training client arrives upset, and a sitter needs help with an aggressive dog at a client's home. Your job is no longer to groom, train, or sit — it is to triage, reassign, and resolve. That is the owner's craft.",
        checks: [
          "How does managing a multi-service business differ from running a single-service salon?",
          "Describe your staffing model: how many groomers, trainers, and sitters, and how do you schedule them?",
          "Write a standard operating procedure for intake that works across all three service lines.",
        ],
      },
      {
        title: "Advanced Skill — Funding, Staffing & Scaling",
        lesson:
          "Term 3 is where PPC distinguishes itself from every other pathway: the advanced business modules cover funding (loans, investors, bootstrapping), staffing (hiring, training, compensation, retention), legal protection (LLC structure, insurance, employment law), and scaling (opening a second location, franchising, or growing a single location). PPC-306 is a safety gate. You will build a complete business plan including a 3-year financial projection, a staffing plan, and a growth strategy. The technical modules this term (PPC-301–306) focus on the highest-level skills: managing a salon floor, running a training program, and overseeing a sitting operation simultaneously.",
        workedExample:
          "Your 3-year projection: Year 1 — one location, $280K revenue, break-even by month 9. Year 2 — add a second groomer and a group training program, $420K revenue, $60K profit. Year 3 — open a second location, $680K revenue, $120K profit. The numbers must be grounded in real market size, pricing, and capacity — not aspiration.",
        checks: [
          "Present your 3-year financial projection. What are your revenue assumptions?",
          "Describe your hiring plan. What do you look for, and how do you retain staff?",
          "What legal structure protects a multi-service pet-care business, and why?",
        ],
      },
      {
        title: "Capstone — PPC-BIZ & Enterprise Launch",
        lesson:
          "Term 4 is the most demanding capstone in the program. You will present a complete multi-service enterprise plan to an instructor panel: your service mix and pricing, your facility and staffing plan, your 3-year financial projection, your funding strategy, your marketing and customer-acquisition plan, and your legal and insurance framework. PPC-403, 405, 410 are safety gates that must be signed off. Your practicum log must show multi-service hours across salon, training, and sitting. By graduation you hold an Advanced Diploma — the terminal credential — and the complete foundation to launch, fund, staff, and scale a multi-service pet-care enterprise. This is the whole-person owner pathway: the craft, the business, and the personal readiness to sustain it.",
        workedExample:
          "Your capstone defense: the panel challenges your staffing cost assumption — 'You budget $15/hr for groomers, but the market is $18.' You must either adjust your numbers or justify why your compensation model (profit-sharing, not just hourly) will attract and retain talent at a comparable effective rate. The panel tests whether your plan survives contact with reality.",
        checks: [
          "Present your complete enterprise plan. Can you defend every number?",
          "How does your practicum log demonstrate multi-service competency?",
          "What is your exit or growth strategy: scale to a second location, franchise, or maximize one location?",
        ],
      },
    ],
    practice: [
      "Write your multi-service business vision in one page: services, facility, target market.",
      "Create a staffing plan for a multi-service facility: roles, headcount, and compensation model.",
      "Build a 3-year financial projection spreadsheet: revenue, costs, profit by month.",
      "Write standard operating procedures for intake that work across grooming, training, and sitting.",
      "Draft a funding plan: how much capital do you need, and what sources will you pursue?",
      "Design a marketing plan that promotes all three service lines without diluting your brand.",
      "Research the legal structure (LLC, S-corp) and insurance coverage for a multi-service pet business in your state.",
      "Write a personal-readiness plan: how will you manage stress, time, and well-being as a business owner?",
    ],
    capstone: {
      title: "PPC-BIZ — Multi-Service Enterprise Launch",
      brief:
        "Present a complete multi-service enterprise plan to an instructor panel: service mix, facility and staffing, 3-year financial projection, funding strategy, marketing plan, legal and insurance framework, and a multi-service practicum log. This is the terminal capstone.",
      deliverables: [
        "A complete business plan with 3-year financial projection and funding strategy.",
        "A staffing plan, SOPs, and legal/insurance framework for a multi-service facility.",
        "A multi-service practicum log signed by instructors showing hours across salon, training, and sitting.",
      ],
    },
    glossary: [
      { term: "Terminal credential", definition: "The highest credential in the pathway ladder; PPC does not stack into any other pathway." },
      { term: "Multi-service practicum", definition: "Hands-on hours across salon, training, and sitting — required for the PPC credential." },
      { term: "Standard Operating Procedure (SOP)", definition: "A documented process that ensures consistent quality across staff and services." },
      { term: "Safety gate", definition: "Modules (PPC-105, 201, 306, 403, 405, 410) that must be signed off before live-animal work at each level." },
      { term: "Bootstrapping", definition: "Funding a business from revenue rather than loans or investors." },
      { term: "Competency Rubric", definition: "The evaluation standard; every row must reach Competent, and safety-critical rows are pass/fail." },
      { term: "Whole-person owner", definition: "The PPC philosophy: craft skill + business skill + personal readiness = sustainable ownership." },
      { term: "PPC-BIZ", definition: "The terminal enterprise capstone reviewed by an instructor panel." },
    ],
  },
];

// ───────────────────────────── Build companions from seeds ─────────────────

function buildCompanion(seed: PathwaySeed): Companion {
  return {
    title: `${seed.title} (${seed.code})`,
    subtitle: `${seed.credential} · ${seed.hours} clock hours · ${seed.weeks} weeks`,
    overview: `${seed.objective}\n\n${BUSINESS_OVERVIEW}`,
    alignment: {
      state: "Louisiana",
      grade: seed.level,
      area: seed.title,
      statute: "Leashed Integrated Course Catalog v3.2 · Program Delivery Guide v1.0",
      authority: "Etnologic Inc — Leashed, Shreveport, Louisiana",
      note:
        "This companion is authored from the Leashed Program Delivery Guide. Module content, evidence, and safety gates are defined in the Integrated Course Catalog v3.2. This is a demonstration build for All About Pawz Academy; review instructional accuracy and local requirements before institutional adoption.",
    },
    learningObjectives: seed.objective
      .split("·")
      .map((s) => s.trim())
      .filter(Boolean),
    sections: seed.sections,
    independentPractice: seed.practice,
    appliedProject: seed.capstone,
    glossary: seed.glossary,
    familyNote:
      `Ask your learner to teach you one skill from ${seed.title} using a real pet or a household object as an example. If they can explain it simply and safely, they understand it.`,
    sources: [
      `Leashed Program Delivery Guide v1.0 — ${seed.code} syllabus (B${SEEDS.indexOf(seed) + 1}).`,
      "Leashed Integrated Course Catalog v3.2 (module content, evidence, rubric, safety gates).",
      "Standards-authority context: Etnologic Inc — Leashed, Shreveport, Louisiana.",
    ],
  };
}

export const PATHWAY_COMPANIONS: PathwaySeed[] = SEEDS;

export function companionForPathway(code: string): Companion {
  const seed = SEEDS.find((s) => s.code === code) ?? SEEDS[0];
  return buildCompanion(seed);
}

export function allPathwayCompanions(): Array<{ seed: PathwaySeed; companion: Companion }> {
  return SEEDS.map((seed) => ({ seed, companion: buildCompanion(seed) }));
}

// The weekly schedule template from the guide (A4): Mon–Fri 08:00–15:30, 6 hr/day.
// Block types: TECHNICAL_LAB, BUSINESS_MODULE, QUICK_CHECKS, PRACTICUM, CAPSTONE, RUBRIC_REVIEW.
export type ScheduleBlock = {
  blockType: string;
  title: string;
  start: string;
  end: string;
  courseIndex: number | null;
  deficiencyFocus?: string;
};

export function weeklyScheduleForPathway(
  courseIndex: number,
  _pathwayCode: string,
): ScheduleBlock[] {
  return [
    // Monday
    { blockType: "TECHNICAL_LAB", title: "Technical lab — Mon", start: "08:00", end: "12:00", courseIndex },
    { blockType: "BUSINESS_MODULE", title: "Business module — Mon", start: "12:30", end: "14:30", courseIndex },
    { blockType: "QUICK_CHECKS", title: "Daily review and practice — Mon", start: "14:30", end: "15:30", courseIndex },
    // Tuesday
    { blockType: "TECHNICAL_LAB", title: "Technical lab — Tue", start: "08:00", end: "12:00", courseIndex },
    { blockType: "PERSONAL_MODULE", title: "Personal module — Tue", start: "12:30", end: "14:30", courseIndex },
    { blockType: "QUICK_CHECKS", title: "Daily review and practice — Tue", start: "14:30", end: "15:30", courseIndex },
    // Wednesday
    { blockType: "TECHNICAL_LAB", title: "Technical lab — Wed", start: "08:00", end: "12:00", courseIndex },
    { blockType: "BUSINESS_MODULE", title: "Business module — Wed", start: "12:30", end: "14:30", courseIndex },
    { blockType: "CHECKPOINT", title: "Checkpoint / quiz — Wed", start: "14:30", end: "15:30", courseIndex },
    // Thursday
    { blockType: "TECHNICAL_LAB", title: "Technical lab — Thu", start: "08:00", end: "12:00", courseIndex },
    { blockType: "BUSINESS_MODULE", title: "Business module — Thu", start: "12:30", end: "14:30", courseIndex },
    { blockType: "QUICK_CHECKS", title: "Daily review and practice — Thu", start: "14:30", end: "15:30", courseIndex },
    // Friday
    { blockType: "PRACTICUM", title: "Practicum / open lab — Fri", start: "08:00", end: "12:00", courseIndex },
    { blockType: "CAPSTONE", title: "Applied capstone work — Fri", start: "12:30", end: "14:30", courseIndex },
    { blockType: "RUBRIC_REVIEW", title: "Rubric review with instructor — Fri", start: "14:30", end: "15:30", courseIndex },
  ];
}
