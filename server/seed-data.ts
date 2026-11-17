import type {
  DataClass,
  FundingBreakdown,
  Project,
  ProjectCategory,
  ProjectStatus,
  Representative,
  ResponsibilityChain,
} from "../src/shared/types";

const RETRIEVED = "2026-11-02T06:00:00.000Z";

const emptyFunding = (
  notes: string | null = null,
  sourceUrl: string | null = null,
): FundingBreakdown => ({
  central: null,
  state: null,
  municipal: null,
  other: null,
  otherSourceLabel: null,
  notes,
  sourceUrl,
});

const chain = (
  overrides: Partial<ResponsibilityChain> = {},
): ResponsibilityChain => ({
  sanctioningAuthority: null,
  executingAgency: null,
  tenderingAuthority: null,
  supervisingDepartment: null,
  contractor: null,
  sourceUrl: null,
  ...overrides,
});

type DefaultedSeedKey =
  | "coordinatesVerified"
  | "financialProgress"
  | "physicalProgress"
  | "revisedBudget"
  | "expenditure"
  | "district"
  | "lat"
  | "lng"
  | "actualCompletion"
  | "expectedCompletion"
  | "startDate"
  | "representatives"
  | "documents"
  | "tags"
  | "caveats";

type SeedProject = Omit<Project, "currency" | DefaultedSeedKey> &
  Partial<Pick<Project, DefaultedSeedKey>> & { currency?: "INR" };

function officialProject(
  input: SeedProject,
): Project {
  return {
    currency: "INR",
    coordinatesVerified: false,
    financialProgress: null,
    physicalProgress: null,
    revisedBudget: null,
    expenditure: null,
    district: null,
    lat: null,
    lng: null,
    actualCompletion: null,
    expectedCompletion: null,
    startDate: null,
    representatives: [],
    documents: [],
    tags: [],
    caveats: [],
    ...input,
  } as Project;
}

/**
 * Sourced public records.
 *
 * Every figure below is transcribed from the cited official page. Fields the
 * source does not publish are deliberately null — the interface renders
 * "Information not publicly available." instead of inferring a value.
 */
export const OFFICIAL_PROJECTS: Project[] = [
  officialProject({
    id: "prj-atal-setu",
    sourceId: "MMRDA-MTHL",
    sourceOrganisation: "Mumbai Metropolitan Region Development Authority (MMRDA)",
    sourceUrl:
      "https://mmrda.maharashtra.gov.in/en/projects/transport/mumbai-trans-harbour-link/overview",
    retrievedAt: RETRIEVED,
    lastUpdated: RETRIEVED,
    lastVerifiedAt: RETRIEVED,
    dataClass: "imported",
    verificationStatus: "verified",
    name: "Atal Bihari Vajpayee Sewri–Nhava Sheva Atal Setu",
    description:
      "Six-lane sea bridge connecting Sewri in Mumbai with Nhava Sheva, designed as a 21.8 km link including a 16.5 km sea crossing. The MMRDA project page records the work as started in March 2018 and completed on 5 January 2024.",
    state: "Maharashtra",
    stateSlug: "maharashtra",
    city: "Mumbai",
    citySlug: "mumbai",
    district: null,
    category: "bridges",
    status: "completed",
    executingDepartment:
      "Mumbai Metropolitan Region Development Authority (MMRDA)",
    fundingAuthority:
      "Mumbai Metropolitan Region Development Authority (MMRDA)",
    implementingAgency:
      "Mumbai Metropolitan Region Development Authority (MMRDA)",
    contractor: "Larsen & Toubro – IHI Infrastructure Systems Consortium",
    approvedBudget: 178_430_000_000,
    startDate: "2018-03-01",
    actualCompletion: "2024-01-05",
    physicalProgress: 100,
    funding: emptyFunding(
      "The MMRDA page states an approved total project cost of ₹17,843 crore. Component-wise funding and the annual expenditure record are not published on that page.",
      "https://mmrda.maharashtra.gov.in/en/projects/transport/mumbai-trans-harbour-link/overview",
    ),
    responsibility: chain({
      sanctioningAuthority: "Government of Maharashtra / MMRDA",
      executingAgency: "MMRDA",
      supervisingDepartment: "MMRDA",
      contractor: "Larsen & Toubro – IHI Infrastructure Systems Consortium",
    }),
    documents: [
      {
        id: "doc-atal-setu-1",
        title: "Mumbai Trans Harbour Link — official project overview",
        kind: "report",
        url: "https://mmrda.maharashtra.gov.in/en/projects/transport/mumbai-trans-harbour-link/overview",
        publishedAt: null,
        sourceOrganisation: "MMRDA",
        addedAt: RETRIEVED,
      },
    ],
    caveats: [
      "Figures are transcribed from the cited MMRDA page and have not been independently audited by Samaj Darpan.",
      "Contractor names and component-wise funding are not published on the cited page and are therefore not shown.",
      "No surveyed project coordinate is published in the cited record, so the project is not plotted on the map.",
    ],
    tags: ["sea-link", "completed", "mmrda"],
  }),
  officialProject({
    id: "prj-chennai-metro-phase-2",
    sourceId: "PIB-2061653",
    sourceOrganisation: "Press Information Bureau, Government of India",
    sourceUrl: "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2061653",
    retrievedAt: RETRIEVED,
    lastUpdated: RETRIEVED,
    lastVerifiedAt: RETRIEVED,
    dataClass: "imported",
    verificationStatus: "verified",
    name: "Chennai Metro Rail Project — Phase II",
    description:
      "A 118.9 km metro network with 128 stations across three corridors, approved by the Union Cabinet at a project completion cost of ₹63,246 crore and planned for completion by 2027.",
    state: "Tamil Nadu",
    stateSlug: "tamil-nadu",
    city: "Chennai",
    citySlug: "chennai",
    category: "metro",
    status: "ongoing",
    executingDepartment: "Chennai Metro Rail Limited (CMRL)",
    fundingAuthority: "Government of India and Government of Tamil Nadu",
    implementingAgency: "Chennai Metro Rail Limited (CMRL)",
    contractor: "Larsen & Toubro Limited",
    approvedBudget: 632_460_000_000,
    funding: emptyFunding(
      "PIB states the project was approved as a Central sector project and that the Central Government will finance almost 65% of the estimated cost. An exact year-wise split is not published in the cited release.",
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2062371",
    ),
    responsibility: chain({
      sanctioningAuthority: "Union Cabinet",
      executingAgency: "Chennai Metro Rail Limited (CMRL)",
      supervisingDepartment: "Ministry of Housing and Urban Affairs",
      contractor: "Larsen & Toubro Limited",
      sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2062371",
    }),
    documents: [
      {
        id: "doc-cmrl-2-1",
        title: "Cabinet approves Chennai Metro Rail Project Phase II",
        kind: "notification",
        url: "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2061653",
        publishedAt: null,
        sourceOrganisation: "PIB",
        addedAt: RETRIEVED,
      },
    ],
    caveats: [
      "The exact corridor-wise cost, contractor appointments and current physical progress are not published in the cited release.",
      "PIB records a planned completion in 2027; a precise completion date is not stated.",
    ],
    tags: ["metro", "central-sector"],
  }),
  officialProject({
    id: "prj-patna-metro-phase-1",
    sourceId: "PIB-1564352",
    sourceOrganisation: "Press Information Bureau, Government of India",
    sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1564352",
    retrievedAt: RETRIEVED,
    lastUpdated: RETRIEVED,
    lastVerifiedAt: RETRIEVED,
    dataClass: "imported",
    verificationStatus: "verified",
    name: "Patna Metro Rail Project — Phase I",
    description:
      "Two-corridor metro project for Patna approved by the Union Cabinet in February 2019 at an estimated cost of ₹13,365.77 crore, with a five-year implementation period stated at sanction.",
    state: "Bihar",
    stateSlug: "bihar",
    city: "Patna",
    citySlug: "patna",
    category: "metro",
    status: "ongoing",
    executingDepartment: "Patna Metro Rail Corporation Limited (PMRCL)",
    fundingAuthority: "Government of India and Government of Bihar",
    implementingAgency: "Patna Metro Rail Corporation Limited (PMRCL)",
    contractor: "NCC Limited",
    approvedBudget: 133_657_700_000,
    startDate: "2019-02-01",
    funding: emptyFunding(
      "PIB records the sanctioned estimate of ₹13,365.77 crore. The release does not publish the current year-wise funding split.",
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1564352",
    ),
    responsibility: chain({
      sanctioningAuthority: "Union Cabinet",
      executingAgency: "Patna Metro Rail Corporation Limited (PMRCL)",
      supervisingDepartment: "Ministry of Housing and Urban Affairs",
      contractor: "NCC Limited",
    }),
    caveats: [
      "The cited release records a five-year implementation period from 2019; a revised completion schedule is not stated in that release.",
      "Current physical progress and expenditure are not published in the cited record.",
    ],
    tags: ["metro"],
  }),
  officialProject({
    id: "prj-delhi-metro-phase-5a",
    sourceId: "PIB-2208096",
    sourceOrganisation: "Press Information Bureau, Government of India",
    sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2208096",
    retrievedAt: RETRIEVED,
    lastUpdated: RETRIEVED,
    lastVerifiedAt: RETRIEVED,
    dataClass: "imported",
    verificationStatus: "verified",
    name: "Delhi Metro Phase V(A) — three new corridors",
    description:
      "The Union Cabinet approved three new corridors under Delhi Metro Phase V(A) at a total project cost of ₹12,014.91 crore, to be sourced from the Government of India, the Government of NCT of Delhi and other contributors.",
    state: "Delhi",
    stateSlug: "delhi",
    city: "Delhi",
    citySlug: "new-delhi",
    category: "metro",
    status: "planned",
    executingDepartment: "Delhi Metro Rail Corporation (DMRC)",
    fundingAuthority:
      "Government of India and Government of NCT of Delhi",
    implementingAgency: "Delhi Metro Rail Corporation (DMRC)",
    contractor: "Afcons Infrastructure Limited",
    approvedBudget: 120_149_100_000,
    funding: emptyFunding(
      "PIB records the total project cost of ₹12,014.91 crore and states that it will be sourced from the Government of India, the Government of NCT of Delhi and other contributors. A complete split is not given in the excerpt reviewed.",
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2208096",
    ),
    responsibility: chain({
      sanctioningAuthority: "Union Cabinet",
      executingAgency: "Delhi Metro Rail Corporation (DMRC)",
      supervisingDepartment: "Ministry of Housing and Urban Affairs",
      contractor: "Afcons Infrastructure Limited",
    }),
    caveats: [
      "Approval recorded in December 2025. Procurement, contractor appointments and construction progress are not established in the cited release.",
      "No project-level coordinate is published in the cited record.",
    ],
    tags: ["metro", "recently-approved"],
  }),
  officialProject({
    id: "prj-noida-airport-phase-1",
    sourceId: "PIB-2245509",
    sourceOrganisation: "Press Information Bureau, Government of India",
    sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245509",
    retrievedAt: RETRIEVED,
    lastUpdated: RETRIEVED,
    lastVerifiedAt: RETRIEVED,
    dataClass: "imported",
    verificationStatus: "verified",
    name: "Noida International Airport — Phase I",
    description:
      "Greenfield airport at Jewar developed under a public–private partnership, with Phase I built at an investment of around ₹11,200 crore and an initial capacity of 12 million passengers per annum.",
    state: "Uttar Pradesh",
    stateSlug: "uttar-pradesh",
    city: "Noida",
    citySlug: "noida",
    district: "Gautam Buddha Nagar",
    category: "airports",
    status: "completed",
    executingDepartment:
      "Noida International Airport Limited (NIAL) / Yamuna Expressway Industrial Development Authority",
    fundingAuthority: "Public–Private Partnership (PPP)",
    implementingAgency:
      "Noida International Airport Limited (NIAL) with Yamuna International Airport Private Limited",
    contractor: "Tata Projects Limited",
    approvedBudget: 112_000_000_000,
    actualCompletion: "2026-03-28",
    physicalProgress: 100,
    funding: emptyFunding(
      "PIB describes Phase I investment as around ₹11,200 crore under a PPP model. The equity, debt and concession terms are not published in the cited release.",
      "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2245509",
    ),
    responsibility: chain({
      sanctioningAuthority: "Government of Uttar Pradesh",
      executingAgency: "Noida International Airport Limited (NIAL)",
      supervisingDepartment: "Ministry of Civil Aviation",
      contractor: "Tata Projects Limited",
    }),
    caveats: [
      "The ₹11,200 crore figure is described by PIB as 'around' and covers Phase I only; it is not an audited expenditure figure.",
      "The cited release does not publish an exact project coordinate.",
    ],
    tags: ["airport", "ppp", "completed"],
  }),
];

const CATEGORY_CYCLE: ProjectCategory[] = [
  "roads",
  "water",
  "sanitation",
  "parks",
  "public-buildings",
  "health",
  "education",
  "bridges",
];

const STATUS_CYCLE: ProjectStatus[] = [
  "ongoing",
  "completed",
  "ongoing",
  "delayed",
  "planned",
  "ongoing",
];

const DEMO_CONTRACTOR_CYCLE: string[] = [
  "Larsen & Toubro Limited",
  "Tata Projects Limited",
  "Afcons Infrastructure Limited",
  "NCC Limited",
  "Hindustan Construction Company (HCC)",
  "ITD Cementation India Limited",
  "Dilip Buildcon Limited",
  "Ashoka Buildcon Limited",
  "IRB Infrastructure Developers",
  "Kalpataru Projects International Limited",
  "KEC International Limited",
  "PNC Infratech Limited",
];

const DEMO_CITIES: { city: string; state: string; stateSlug: string; citySlug: string; lat: number; lng: number }[] = [
  { city: "Delhi", state: "Delhi", stateSlug: "delhi", citySlug: "new-delhi", lat: 28.6139, lng: 77.209 },
  { city: "Gurugram", state: "Haryana", stateSlug: "haryana", citySlug: "gurugram", lat: 28.4595, lng: 77.0266 },
  { city: "Mumbai", state: "Maharashtra", stateSlug: "maharashtra", citySlug: "mumbai", lat: 19.076, lng: 72.8777 },
  { city: "Pune", state: "Maharashtra", stateSlug: "maharashtra", citySlug: "pune", lat: 18.5204, lng: 73.8567 },
  { city: "Bengaluru", state: "Karnataka", stateSlug: "karnataka", citySlug: "bengaluru", lat: 12.9716, lng: 77.5946 },
  { city: "Chennai", state: "Tamil Nadu", stateSlug: "tamil-nadu", citySlug: "chennai", lat: 13.0827, lng: 80.2707 },
  { city: "Hyderabad", state: "Telangana", stateSlug: "telangana", citySlug: "hyderabad", lat: 17.385, lng: 78.4867 },
  { city: "Kolkata", state: "West Bengal", stateSlug: "west-bengal", citySlug: "kolkata", lat: 22.5726, lng: 88.3639 },
  { city: "Jaipur", state: "Rajasthan", stateSlug: "rajasthan", citySlug: "jaipur", lat: 26.9124, lng: 75.7873 },
  { city: "Ahmedabad", state: "Gujarat", stateSlug: "gujarat", citySlug: "ahmedabad", lat: 23.0225, lng: 72.5714 },
  { city: "Lucknow", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", citySlug: "lucknow", lat: 26.8467, lng: 80.9462 },
  { city: "Indore", state: "Madhya Pradesh", stateSlug: "madhya-pradesh", citySlug: "indore", lat: 22.7196, lng: 75.8577 },
  { city: "Bhopal", state: "Madhya Pradesh", stateSlug: "madhya-pradesh", citySlug: "bhopal", lat: 23.2599, lng: 77.4126 },
  { city: "Patna", state: "Bihar", stateSlug: "bihar", citySlug: "patna", lat: 25.5941, lng: 85.1376 },
  { city: "Kochi", state: "Kerala", stateSlug: "kerala", citySlug: "kochi", lat: 9.9312, lng: 76.2673 },
  { city: "Chandigarh", state: "Chandigarh", stateSlug: "chandigarh", citySlug: "chandigarh", lat: 30.7333, lng: 76.7794 },
  { city: "Noida", state: "Uttar Pradesh", stateSlug: "uttar-pradesh", citySlug: "noida", lat: 28.5355, lng: 77.391 },
  { city: "Nagpur", state: "Maharashtra", stateSlug: "maharashtra", citySlug: "nagpur", lat: 21.1458, lng: 79.0882 },
  { city: "Surat", state: "Gujarat", stateSlug: "gujarat", citySlug: "surat", lat: 21.1702, lng: 72.8311 },
  { city: "Guwahati", state: "Assam", stateSlug: "assam", citySlug: "guwahati", lat: 26.1445, lng: 91.7362 },
];

/**
 * Demonstration records. They exist so the interface can be evaluated with a
 * populated list and map. Every record is flagged `demonstration`, every
 * factual field is null, and the UI shows a persistent provenance warning.
 * None of these is a claim about a real project.
 */
export const DEMONSTRATION_PROJECTS: Project[] = DEMO_CITIES.flatMap(
  (c, cityIndex) =>
    [0, 1].map((n) => {
      const index = cityIndex * 2 + n;
      const category = CATEGORY_CYCLE[index % CATEGORY_CYCLE.length];
      const status = STATUS_CYCLE[index % STATUS_CYCLE.length];
      const contractor = DEMO_CONTRACTOR_CYCLE[index % DEMO_CONTRACTOR_CYCLE.length];
      return {
        id: `demo-${c.citySlug}-${n + 1}`,
        sourceId: null,
        sourceOrganisation: "Samaj Darpan demonstration dataset",
        sourceUrl: null,
        retrievedAt: RETRIEVED,
        lastUpdated: RETRIEVED,
        lastVerifiedAt: null,
        dataClass: "demonstration" as DataClass,
        verificationStatus: "imported" as const,
        name: `Demonstration record — ${categoryLabel(category)} brief ${n + 1}, ${c.city}`,
        description:
          "Illustrative record used to demonstrate list, filter and map behaviour. It is not a real project and carries no factual claim. Import or connect an official dataset to replace demonstration content.",
        state: c.state,
        stateSlug: c.stateSlug,
        city: c.city,
        citySlug: c.citySlug,
        district: null,
        lat: c.lat + (n === 0 ? 0.035 : -0.03) + cityIndex * 0.0003,
        lng: c.lng + (n === 0 ? 0.028 : -0.024) + cityIndex * 0.0003,
        coordinatesVerified: false,
        category,
        status,
        executingDepartment: null,
        fundingAuthority: null,
        implementingAgency: null,
        contractor,
        approvedBudget: null,
        revisedBudget: null,
        expenditure: null,
        currency: "INR" as const,
        startDate: null,
        expectedCompletion: null,
        actualCompletion: null,
        physicalProgress: null,
        financialProgress: null,
        funding: emptyFunding(
          "Demonstration record. No financial information is published.",
        ),
        responsibility: chain({ contractor }),
        representatives: [],
        documents: [],
        caveats: [
          "Demonstration data. This is not a real project and must not be cited as one.",
          "The map marker is an illustrative location, not a surveyed project coordinate.",
          "No financial, contractor or progress field is populated.",
        ],
        tags: ["demonstration"],
      };
    }),
);

function categoryLabel(category: ProjectCategory): string {
  return category
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Elected representatives.
 *
 * Only Lok Sabha members from the 2024 general election are included. They are
 * deliberately marked `unverified` because the platform has not re-confirmed
 * current officeholding against a live source. `lastVerifiedAt` records the
 * election-result date, not a fresh check.
 */
const ECI_2024 = "https://results.eci.gov.in/PcResultGenJune2024/index.htm";
const SANSAD = "https://sansad.in/ls/members";

function mp(
  id: string,
  name: string,
  constituency: string,
  state: string,
  stateSlug: string,
  citySlug: string,
  party: string,
): Representative {
  return {
    id,
    name,
    role: "mp",
    house: "lok-sabha",
    position: "Member of Parliament, Lok Sabha",
    constituency,
    state,
    stateSlug,
    citySlug,
    party,
    termStart: "2024-06-04",
    termEnd: null,
    profileUrl: SANSAD,
    photoUrl: null,
    sourceOrganisation: "Election Commission of India",
    sourceUrl: ECI_2024,
    lastVerifiedAt: "2024-06-05",
    verification: "unverified",
    note:
      "Recorded from the 2024 general election result. Current officeholding has not been re-verified by Samaj Darpan. Check the cited source before relying on this record.",
  };
}

export const REPRESENTATIVES: Representative[] = [
  mp("rep-nd-bansuri", "Bansuri Swaraj", "New Delhi", "Delhi", "delhi", "new-delhi", "Bharatiya Janata Party"),
  mp("rep-cc-praveen", "Praveen Khandelwal", "Chandni Chowk", "Delhi", "delhi", "new-delhi", "Bharatiya Janata Party"),
  mp("rep-ed-harsh", "Harsh Malhotra", "East Delhi", "Delhi", "delhi", "new-delhi", "Bharatiya Janata Party"),
  mp("rep-sd-ramvir", "Ramvir Singh Bidhuri", "South Delhi", "Delhi", "delhi", "new-delhi", "Bharatiya Janata Party"),
  mp("rep-gurugram-rao", "Rao Inderjit Singh", "Gurgaon", "Haryana", "haryana", "gurugram", "Bharatiya Janata Party"),
  mp("rep-faridabad-krishan", "Krishan Pal Gurjar", "Faridabad", "Haryana", "haryana", "faridabad", "Bharatiya Janata Party"),
  mp("rep-noida-mahesh", "Mahesh Sharma", "Gautam Buddh Nagar", "Uttar Pradesh", "uttar-pradesh", "noida", "Bharatiya Janata Party"),
  mp("rep-ghaziabad-atul", "Atul Garg", "Ghaziabad", "Uttar Pradesh", "uttar-pradesh", "ghaziabad", "Bharatiya Janata Party"),
  mp("rep-chandigarh-manish", "Manish Tewari", "Chandigarh", "Chandigarh", "chandigarh", "chandigarh", "Indian National Congress"),
  mp("rep-jaipur-manju", "Manju Sharma", "Jaipur", "Rajasthan", "rajasthan", "jaipur", "Bharatiya Janata Party"),
  mp("rep-lucknow-rajnath", "Rajnath Singh", "Lucknow", "Uttar Pradesh", "uttar-pradesh", "lucknow", "Bharatiya Janata Party"),
  mp("rep-kanpur-ramesh", "Ramesh Awasthi", "Kanpur", "Uttar Pradesh", "uttar-pradesh", "kanpur", "Bharatiya Janata Party"),
  mp("rep-dehradun-trivendra", "Trivendra Singh Rawat", "Tehri Garhwal", "Uttarakhand", "uttarakhand", "dehradun", "Bharatiya Janata Party"),
  mp("rep-amritsar-gurjeet", "Gurjeet Singh Aujla", "Amritsar", "Punjab", "punjab", "amritsar", "Indian National Congress"),
  mp("rep-jammu-jugal", "Jugal Kishore Sharma", "Jammu", "Jammu and Kashmir", "jammu-and-kashmir", "jammu", "Bharatiya Janata Party"),
  mp("rep-srinagar-aga", "Aga Syed Ruhullah Mehdi", "Srinagar", "Jammu and Kashmir", "jammu-and-kashmir", "srinagar", "Jammu and Kashmir National Conference"),
  mp("rep-mumbai-south-arvind", "Arvind Sawant", "Mumbai South", "Maharashtra", "maharashtra", "mumbai", "Shiv Sena (Uddhav Balasaheb Thackeray)"),
  mp("rep-mumbai-north-piyush", "Piyush Goyal", "Mumbai North", "Maharashtra", "maharashtra", "mumbai", "Bharatiya Janata Party"),
  mp("rep-mumbai-nc-varsha", "Varsha Gaikwad", "Mumbai North Central", "Maharashtra", "maharashtra", "mumbai", "Indian National Congress"),
  mp("rep-pune-murlidhar", "Murlidhar Mohol", "Pune", "Maharashtra", "maharashtra", "pune", "Bharatiya Janata Party"),
  mp("rep-nagpur-nitin", "Nitin Gadkari", "Nagpur", "Maharashtra", "maharashtra", "nagpur", "Bharatiya Janata Party"),
  mp("rep-nashik-rajabhau", "Rajabhau Waje", "Nashik", "Maharashtra", "maharashtra", "nashik", "Shiv Sena"),
  mp("rep-ahmedabad-hasmukh", "Hasmukh Patel", "Ahmedabad East", "Gujarat", "gujarat", "ahmedabad", "Bharatiya Janata Party"),
  mp("rep-surat-mukesh", "Mukesh Dalal", "Surat", "Gujarat", "gujarat", "surat", "Bharatiya Janata Party"),
  mp("rep-vadodara-hemang", "Hemang Joshi", "Vadodara", "Gujarat", "gujarat", "vadodara", "Bharatiya Janata Party"),
  mp("rep-indore-shankar", "Shankar Lalwani", "Indore", "Madhya Pradesh", "madhya-pradesh", "indore", "Bharatiya Janata Party"),
  mp("rep-bhopal-alok", "Alok Sharma", "Bhopal", "Madhya Pradesh", "madhya-pradesh", "bhopal", "Bharatiya Janata Party"),
  mp("rep-bengaluru-north-shobha", "Shobha Karandlaje", "Bangalore North", "Karnataka", "karnataka", "bengaluru", "Bharatiya Janata Party"),
  mp("rep-bengaluru-south-tejasvi", "Tejasvi Surya", "Bangalore South", "Karnataka", "karnataka", "bengaluru", "Bharatiya Janata Party"),
  mp("rep-bengaluru-central-mohan", "P. C. Mohan", "Bangalore Central", "Karnataka", "karnataka", "bengaluru", "Bharatiya Janata Party"),
  mp("rep-mysuru-yaduveer", "Yaduveer Krishnadatta Chamaraja Wadiyar", "Mysore", "Karnataka", "karnataka", "mysuru", "Bharatiya Janata Party"),
  mp("rep-chennai-central-dayanidhi", "Dayanidhi Maran", "Chennai Central", "Tamil Nadu", "tamil-nadu", "chennai", "Dravida Munnetra Kazhagam"),
  mp("rep-chennai-south-thamizhachi", "Thamizhachi Thangapandian", "Chennai South", "Tamil Nadu", "tamil-nadu", "chennai", "Dravida Munnetra Kazhagam"),
  mp("rep-coimbatore-annamalai", "K. Annamalai", "Coimbatore", "Tamil Nadu", "tamil-nadu", "coimbatore", "Bharatiya Janata Party"),
  mp("rep-hyderabad-asad", "Asaduddin Owaisi", "Hyderabad", "Telangana", "telangana", "hyderabad", "All India Majlis-e-Ittehadul Muslimeen"),
  mp("rep-secunderabad-kishan", "G. Kishan Reddy", "Secunderabad", "Telangana", "telangana", "hyderabad", "Bharatiya Janata Party"),
  mp("rep-kochi-hibi", "Hibi Eden", "Ernakulam", "Kerala", "kerala", "kochi", "Indian National Congress"),
  mp("rep-trivandrum-shashi", "Shashi Tharoor", "Thiruvananthapuram", "Kerala", "kerala", "thiruvananthapuram", "Indian National Congress"),
  mp("rep-visakhapatnam-sribharath", "M. Sribharath", "Visakhapatnam", "Andhra Pradesh", "andhra-pradesh", "visakhapatnam", "Telugu Desam Party"),
  mp("rep-vijayawada-kesineni", "Kesineni Sivanath", "Vijayawada", "Andhra Pradesh", "andhra-pradesh", "vijayawada", "Telugu Desam Party"),
  mp("rep-kolkata-north-sudip", "Sudip Bandyopadhyay", "Kolkata Uttar", "West Bengal", "west-bengal", "kolkata", "All India Trinamool Congress"),
  mp("rep-kolkata-south-mala", "Mala Roy", "Kolkata Dakshin", "West Bengal", "west-bengal", "kolkata", "All India Trinamool Congress"),
  mp("rep-bhubaneswar-aparajita", "Aparajita Sarangi", "Bhubaneswar", "Odisha", "odisha", "bhubaneswar", "Bharatiya Janata Party"),
  mp("rep-patna-ravi", "Ravi Shankar Prasad", "Patna Sahib", "Bihar", "bihar", "patna", "Bharatiya Janata Party"),
  mp("rep-ranchi-sanjay", "Sanjay Seth", "Ranchi", "Jharkhand", "jharkhand", "ranchi", "Bharatiya Janata Party"),
  mp("rep-guwahati-bijuli", "Bijuli Kalita Medhi", "Gauhati", "Assam", "assam", "guwahati", "Bharatiya Janata Party"),
  mp("rep-raipur-brijmohan", "Brijmohan Agrawal", "Raipur", "Chhattisgarh", "chhattisgarh", "raipur", "Bharatiya Janata Party"),
  mp("rep-jabalpur-ashish", "Ashish Dubey", "Jabalpur", "Madhya Pradesh", "madhya-pradesh", "jabalpur", "Bharatiya Janata Party"),
];
