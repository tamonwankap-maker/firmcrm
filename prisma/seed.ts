/**
 * Seed: lookup data (always) + first admin (if no admin exists) + demo data (dev only, `--demo`).
 * Idempotent — safe to run repeatedly.
 *
 *   npm run db:seed            # lookups + admin
 *   npm run db:seed -- --demo  # also demo users/records for local testing
 */
import "dotenv/config";
import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ARGON2_OPTIONS } from "../src/server/auth/argon";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

const PRACTICE_AREAS = [
  "Corporate/M&A",
  "Capital Markets",
  "Banking & Finance",
  "Disputes/Litigation",
  "Tax",
  "Trade & Customs",
  "Public & Administrative Law",
  "Energy & Infrastructure",
  "Real Estate",
  "Employment",
  "IP/Technology & Data",
  "Competition",
];

const DIRECTORIES = [
  { name: "Legal 500", website: "https://www.legal500.com" },
  { name: "Chambers & Partners", website: "https://chambers.com" },
  { name: "IFLR1000", website: "https://www.iflr1000.com" },
  { name: "Benchmark Litigation", website: "https://benchmarklitigation.com" },
  { name: "Asialaw", website: "https://www.asialaw.com" },
  { name: "ALB", website: "https://www.legalbusinessonline.com" },
];

const INDUSTRIES = [
  "Automotive",
  "Banking & Financial Services",
  "Construction",
  "Consumer & Retail",
  "Energy & Utilities",
  "Food & Agriculture",
  "Government & Public Sector",
  "Healthcare & Life Sciences",
  "Hospitality & Tourism",
  "Industrial & Manufacturing",
  "Insurance",
  "Logistics & Transport",
  "Media & Entertainment",
  "Petrochemicals",
  "Private Equity & Funds",
  "Real Estate",
  "Technology & Telecoms",
  "Other",
];

async function seedLookups() {
  for (const [i, name] of PRACTICE_AREAS.entries()) {
    await db.practiceArea.upsert({ where: { name }, create: { name, sortOrder: i + 1 }, update: {} });
  }
  for (const d of DIRECTORIES) {
    await db.directory.upsert({ where: { name: d.name }, create: d, update: {} });
  }
  for (const name of INDUSTRIES) {
    await db.industry.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.log(
    `✓ ${PRACTICE_AREAS.length} practice areas, ${DIRECTORIES.length} directories, ${INDUSTRIES.length} industries`,
  );
}

async function seedAdmin() {
  const existing = await db.user.count({ where: { role: "ADMIN" } });
  if (existing > 0) {
    console.log("✓ admin already exists — skipped");
    return;
  }
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first admin.");
  await db.user.create({
    data: {
      name: "Head of BD",
      email,
      role: "ADMIN",
      title: "Head of Business Development",
      passwordHash: await hash(password, ARGON2_OPTIONS),
      mustChangePassword: process.env.NODE_ENV === "production",
    },
  });
  console.log(`✓ admin created: ${email}`);
}

/** Demo users for local testing — one per role. Password for all: DemoPass2026! */
async function seedDemo() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data in production.");
  const passwordHash = await hash("DemoPass2026!", ARGON2_OPTIONS);
  const pa = Object.fromEntries((await db.practiceArea.findMany()).map((p) => [p.name, p.id]));
  const users = [
    { email: "bd@example.com", name: "Ploy Srisuk", role: "BD", title: "BD Manager", areas: [] },
    {
      email: "partner@example.com",
      name: "Somchai Wongsakul",
      role: "PARTNER",
      title: "Partner",
      areas: ["Corporate/M&A", "Capital Markets"],
    },
    {
      email: "partner2@example.com",
      name: "Anong Rattanakorn",
      role: "PARTNER",
      title: "Partner",
      areas: ["Disputes/Litigation"],
    },
    {
      email: "viewer@example.com",
      name: "Nattapong Chai",
      role: "VIEWER",
      title: "Associate",
      areas: ["Corporate/M&A"],
    },
    { email: "bd2@example.com", name: "Tanawat Boonmee", role: "BD", title: "BD Coordinator", areas: [] },
  ] as const;
  for (const u of users) {
    await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        title: u.title,
        passwordHash,
        practiceAreas: { connect: u.areas.map((a) => ({ id: pa[a] })) },
      },
    });
  }
  await db.user.upsert({
    where: { email: "kittipong@example.com" },
    update: {},
    create: {
      email: "kittipong@example.com",
      name: "Kittipong Thanakit",
      role: "VIEWER",
      title: "Senior Associate",
      canLogin: false,
    },
  });
  console.log(
    "✓ demo users (password DemoPass2026!): bd@, bd2@, partner@, partner2@, viewer@example.com + 1 no-login lawyer",
  );
  await seedDemoPipeline();
  await seedDemoRankings();
  await seedDemoMarketing();
}

/** Demo event with invites (mixed consent), content pipeline and a key-client plan. */
async function seedDemoMarketing() {
  if ((await db.event.count()) > 0) {
    console.log("✓ demo marketing already present — skipped");
    return;
  }
  const user = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id;
  const [somchai, ploy, anong] = await Promise.all([
    user("partner@example.com"),
    user("bd@example.com"),
    user("partner2@example.com"),
  ]);
  const pa = Object.fromEntries((await db.practiceArea.findMany()).map((p) => [p.name, p.id]));
  const bank = await db.organisation.findFirst({ where: { nameKey: "siam example bank" } });
  const contacts = await db.contact.findMany({ where: { archivedAt: null }, take: 10 });
  if (!bank || contacts.length < 2) return;

  // Arthit (Mekong) has event-invite consent; Wanida (Siam Example Bank) deliberately does not.
  const arthit = await db.contact.findFirst({ where: { nameKey: "arthit kongsuk" } });
  if (arthit) {
    await db.mailingConsent.upsert({
      where: { contactId_list: { contactId: arthit.id, list: "EVENT_INVITES" } },
      create: {
        contactId: arthit.id,
        list: "EVENT_INVITES",
        optedIn: true,
        consentDate: new Date(),
        source: "EVENT_SIGNUP",
      },
      update: {},
    });
  }
  const start = new Date(Date.now() + 21 * 86_400_000);
  start.setUTCHours(1, 30, 0, 0); // 08:30 Bangkok
  const past = new Date(Date.now() - 20 * 86_400_000);
  past.setUTCHours(11, 0, 0, 0); // 18:00 Bangkok
  await db.event.create({
    data: {
      title: "Capital Markets Outlook 2027 — breakfast briefing",
      startsAt: start,
      format: "IN_PERSON",
      venue: "Grand Hyatt Erawan Bangkok",
      status: "INVITES_SENT",
      budget: 180_000,
      ownerId: ploy,
      speakers: { connect: [{ id: somchai }] },
      practiceAreas: { connect: [{ id: pa["Capital Markets"] }] },
      invites: {
        create: contacts.slice(0, 2).map((c, i) => ({
          contactId: c.id,
          invited: true,
          invitedAt: new Date(),
          rsvp: i === 0 ? "YES" : "NO_REPLY",
        })),
      },
    },
  });
  await db.event.create({
    data: {
      title: "Japan Desk client dinner",
      startsAt: past,
      format: "IN_PERSON",
      venue: "Firm offices, 32nd floor",
      status: "HELD",
      budget: 120_000,
      actualCost: 96_500,
      ownerId: ploy,
      speakers: { connect: [{ id: anong }] },
      invites: {
        create: contacts
          .slice(0, 2)
          .map((c) => ({ contactId: c.id, invited: true, rsvp: "YES", attended: true, followUpOwnerId: somchai })),
      },
    },
  });

  const content = (
    title: string,
    type: "CLIENT_ALERT" | "ARTICLE" | "LINKEDIN_POST",
    status: "IDEA" | "DRAFTING" | "REVIEW" | "PUBLISHED",
    author: string,
    area: string,
    days?: number,
  ) =>
    db.content.create({
      data: {
        title,
        type,
        status,
        channel: type === "LINKEDIN_POST" ? "LinkedIn" : "Firm website",
        publishDate: days == null ? null : new Date(Date.now() + days * 86_400_000),
        authors: { connect: [{ id: author }] },
        practiceAreas: { connect: [{ id: pa[area] }] },
      },
    });
  await content("SEC amends green bond disclosure rules", "CLIENT_ALERT", "PUBLISHED", somchai, "Capital Markets", -12);
  await content("Thailand's new merger control thresholds explained", "ARTICLE", "REVIEW", anong, "Competition", 7);
  await content(
    "PDPA enforcement: first administrative fines",
    "LINKEDIN_POST",
    "DRAFTING",
    anong,
    "IP/Technology & Data",
  );
  await content("BOI incentives for data centres", "CLIENT_ALERT", "IDEA", somchai, "Energy & Infrastructure");

  await db.clientPlan.create({
    data: {
      organisationId: bank.id,
      year: new Date().getUTCFullYear(),
      objectives:
        "• Retain debt capital markets mandates (target: 2 programmes)\n• Introduce Tax and Employment teams to the new CFO\n• Quarterly lunch with the General Counsel",
      healthScore: 4,
      ownerId: somchai,
      reviewMeetingDate: new Date(Date.now() + 45 * 86_400_000),
      crossSellTargets: { connect: [{ id: pa["Tax"] }, { id: pa["Employment"] }, { id: pa["Capital Markets"] }] },
    },
  });
  console.log("✓ demo marketing: 2 events with invites, 4 content items, 1 client plan");
}

/** Demo matters, directory submissions (with a reused referee) and awards. */
async function seedDemoRankings() {
  if ((await db.directorySubmission.count()) > 0) {
    console.log("✓ demo rankings already present — skipped");
    return;
  }
  const user = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id;
  const [somchai, ploy, anong] = await Promise.all([
    user("partner@example.com"),
    user("bd@example.com"),
    user("partner2@example.com"),
  ]);
  const pa = Object.fromEntries((await db.practiceArea.findMany()).map((p) => [p.name, p.id]));
  const dir = Object.fromEntries((await db.directory.findMany()).map((d) => [d.name, d.id]));
  const bank = await db.organisation.findFirst({ where: { nameKey: "siam example bank" } });
  const energy = await db.organisation.findFirst({ where: { nameKey: "mekong energy holdings" } });
  if (!bank || !energy) return;

  const gc = await db.contact.create({
    data: {
      nameEn: "Khun Wanida Charoenkul",
      nameTh: "วนิดา เจริญกุล",
      nameKey: "wanida charoenkul",
      title: "General Counsel",
      email: "wanida@siambank.example",
      organisationId: bank.id,
      relationshipStrength: 5,
      owners: { connect: [{ id: somchai }] },
    },
  });
  await db.contact.create({
    data: {
      nameEn: "Mr. Arthit Kongsuk",
      nameKey: "arthit kongsuk",
      title: "CFO",
      email: "arthit@mekong.example",
      organisationId: energy.id,
      relationshipStrength: 3,
      owners: { connect: [{ id: somchai }] },
    },
  });

  const year = new Date().getUTCFullYear();
  const m1 = await db.representativeMatter.create({
    data: {
      title: "THB 10bn green bond issuance",
      clientOrganisationId: bank.id,
      year: year - 1,
      value: 10_000_000_000,
      publishable: true,
      description: "Advised the issuer on its debut green bond under the SEC sustainable bond framework.",
      practiceAreas: { connect: [{ id: pa["Capital Markets"] }] },
      team: { connect: [{ id: somchai }] },
    },
  });
  const m2 = await db.representativeMatter.create({
    data: {
      title: "Acquisition of a Thai logistics platform",
      anonymised: true,
      clientDisplayName: "a Japanese trading house",
      year: year - 1,
      publishable: true,
      description: "Advised on the acquisition of a 60% stake, including competition filing.",
      practiceAreas: { connect: [{ id: pa["Corporate/M&A"] }, { id: pa["Competition"] }] },
      team: { connect: [{ id: anong }] },
    },
  });
  const m3 = await db.representativeMatter.create({
    data: {
      title: "Project Sunrise — solar IPP acquisition (confidential)",
      clientOrganisationId: energy.id,
      year,
      confidential: true,
      description: "Ongoing; not to be disclosed.",
      practiceAreas: { connect: [{ id: pa["Energy & Infrastructure"] }] },
      team: { connect: [{ id: somchai }, { id: ploy }] },
    },
  });

  const sub = (o: {
    dir: string;
    year: number;
    area: string;
    status: "PLANNING" | "DRAFTING" | "RESULTS_PUBLISHED";
    deadline?: Date;
    tier?: string;
    matters: string[];
  }) =>
    db.directorySubmission.create({
      data: {
        directoryId: dir[o.dir],
        year: o.year,
        practiceAreaId: pa[o.area],
        status: o.status,
        deadline: o.deadline,
        resultTier: o.tier,
        ownerId: ploy,
        partnerReviewerId: somchai,
        rankedLawyers: { connect: [{ id: somchai }] },
        matters: { connect: o.matters.map((id) => ({ id })) },
      },
    });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const prev = await sub({
    dir: "Legal 500",
    year: year,
    area: "Capital Markets",
    status: "RESULTS_PUBLISHED",
    tier: "Tier 2",
    matters: [m1.id],
  });
  const l500 = await sub({
    dir: "Legal 500",
    year: year + 1,
    area: "Capital Markets",
    status: "DRAFTING",
    deadline: new Date(today.getTime() + 10 * 86_400_000),
    matters: [m1.id],
  });
  await sub({
    dir: "Chambers & Partners",
    year: year + 1,
    area: "Corporate/M&A",
    status: "PLANNING",
    deadline: new Date(today.getTime() + 40 * 86_400_000),
    matters: [m2.id, m3.id],
  });
  await db.referee.create({
    data: { contactId: gc.id, submissionId: prev.id, briefed: true, briefedDate: new Date(Date.UTC(year - 1, 8, 1)) },
  });
  await db.referee.create({ data: { contactId: gc.id, submissionId: l500.id } });

  await db.award.create({
    data: {
      name: "ALB Thailand Law Awards",
      category: "Debt Market Deal of the Year",
      year,
      status: "SHORTLISTED",
      ownerId: ploy,
      practiceAreas: { connect: [{ id: pa["Capital Markets"] }] },
    },
  });
  await db.award.create({
    data: {
      name: "IFLR Asia-Pacific Awards",
      category: "Thailand Law Firm of the Year",
      year: year + 1,
      status: "ENTERED",
      ownerId: ploy,
      deadline: new Date(today.getTime() + 20 * 86_400_000),
    },
  });
  console.log("✓ demo rankings: 3 matters (1 confidential), 3 submissions, reused referee, 2 awards");
}

/** A small, realistic pipeline for local review (skipped if any opportunity exists). */
async function seedDemoPipeline() {
  if ((await db.opportunity.count()) > 0) {
    console.log("✓ demo pipeline already present — skipped");
    return;
  }
  const user = async (email: string) => (await db.user.findUniqueOrThrow({ where: { email } })).id;
  const [somchai, anong, ploy] = await Promise.all([
    user("partner@example.com"),
    user("partner2@example.com"),
    user("bd@example.com"),
  ]);
  const pa = Object.fromEntries((await db.practiceArea.findMany()).map((p) => [p.name, p.id]));
  const org = (nameEn: string, nameTh: string | null, type: "CLIENT" | "PROSPECT", nameKey: string, partner: string) =>
    db.organisation.create({
      data: { nameEn, nameTh, type, nameKey, relationshipPartnerId: partner, isKeyClient: type === "CLIENT" },
    });
  const bank = await org(
    "Siam Example Bank PCL",
    "ธนาคารสยามตัวอย่าง จำกัด (มหาชน)",
    "CLIENT",
    "siam example bank",
    somchai,
  );
  const energy = await org(
    "Mekong Energy Holdings Co., Ltd.",
    "บริษัท แม่โขง เอนเนอร์ยี่ โฮลดิ้งส์ จำกัด",
    "PROSPECT",
    "mekong energy holdings",
    somchai,
  );
  const tanaka = await org("Tanaka Shoji (Thailand) Co., Ltd.", null, "CLIENT", "tanaka shoji thailand", anong);

  const year = new Date().getUTCFullYear();
  const day = (offset: number) => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return new Date(d.getTime() + offset * 86_400_000);
  };
  type Stage = "LEAD" | "QUALIFIED" | "PROPOSAL_PREPARING" | "SUBMITTED" | "WON" | "LOST";
  const opp = (o: {
    name: string;
    org: string;
    lead: string;
    team?: string[];
    areas: string[];
    stage: Stage;
    source: "REPEAT_CLIENT" | "REFERRAL" | "RFP_TENDER" | "INBOUND";
    min?: number;
    max?: number;
    currency?: "THB" | "USD";
    probability: number;
    conflict: "NOT_REQUESTED" | "REQUESTED" | "CLEARED";
    confidential?: boolean;
    decision?: Date;
    reason?: "PRICE" | "RELATIONSHIP";
    closed?: Date;
  }) =>
    db.opportunity.create({
      data: {
        name: o.name,
        organisationId: o.org,
        leadPartnerId: o.lead,
        source: o.source,
        stage: o.stage,
        probability: o.probability,
        conflictStatus: o.conflict,
        feeEstimateMin: o.min,
        feeEstimateMax: o.max,
        currency: o.currency ?? "THB",
        confidential: o.confidential ?? false,
        expectedDecisionDate: o.decision,
        outcomeReason: o.reason,
        closedDate: o.closed,
        createdById: ploy,
        team: { connect: (o.team ?? []).map((id) => ({ id })) },
        practiceAreas: { connect: o.areas.map((a) => ({ id: pa[a] })) },
        stageChanges: { create: { toStage: o.stage, changedById: ploy } },
      },
    });

  const bond = await opp({
    name: "THB 5bn debenture programme",
    org: bank.id,
    lead: somchai,
    team: [ploy],
    areas: ["Capital Markets"],
    stage: "SUBMITTED",
    source: "REPEAT_CLIENT",
    min: 3_000_000,
    max: 4_500_000,
    probability: 60,
    conflict: "CLEARED",
    decision: day(14),
  });
  const solar = await opp({
    name: "Project Sunrise — solar IPP acquisition",
    org: energy.id,
    lead: somchai,
    team: [ploy],
    areas: ["Energy & Infrastructure", "Corporate/M&A"],
    stage: "PROPOSAL_PREPARING",
    source: "REFERRAL",
    min: 150_000,
    max: 250_000,
    currency: "USD",
    probability: 40,
    conflict: "REQUESTED",
    confidential: true,
    decision: day(30),
  });
  await opp({
    name: "Customs valuation dispute",
    org: tanaka.id,
    lead: anong,
    areas: ["Trade & Customs", "Disputes/Litigation"],
    stage: "QUALIFIED",
    source: "REPEAT_CLIENT",
    min: 800_000,
    max: 1_200_000,
    probability: 25,
    conflict: "CLEARED",
    decision: day(45),
  });
  await opp({
    name: "Branch network restructuring — employment advice",
    org: bank.id,
    lead: somchai,
    areas: ["Employment"],
    stage: "WON",
    source: "REPEAT_CLIENT",
    min: 1_500_000,
    max: 1_500_000,
    probability: 100,
    conflict: "CLEARED",
    reason: "RELATIONSHIP",
    closed: new Date(Date.UTC(year, 1, 10)),
  });
  await opp({
    name: "PDPA compliance programme",
    org: tanaka.id,
    lead: anong,
    areas: ["IP/Technology & Data"],
    stage: "LOST",
    source: "RFP_TENDER",
    min: 900_000,
    max: 1_100_000,
    probability: 0,
    conflict: "CLEARED",
    reason: "PRICE",
    closed: new Date(Date.UTC(year, 3, 2)),
  });
  await opp({
    name: "Warehouse JV in EEC",
    org: tanaka.id,
    lead: anong,
    areas: ["Real Estate", "Corporate/M&A"],
    stage: "LEAD",
    source: "INBOUND",
    probability: 10,
    conflict: "NOT_REQUESTED",
  });

  const checklist = (done: number) => ({
    create: ["Team CVs", "Credentials", "Fee proposal", "Representative matters", "Firm profile"].map((label, i) => ({
      label,
      isStandard: true,
      sortOrder: i,
      done: i < done,
    })),
  });
  await db.pitch.create({
    data: { opportunityId: bond.id, deadline: day(-3), ownerId: ploy, status: "SUBMITTED", checklist: checklist(5) },
  });
  await db.pitch.create({
    data: {
      opportunityId: solar.id,
      deadline: new Date(day(5).getTime() + 10 * 3600_000),
      ownerId: ploy,
      format: "BOTH",
      checklist: checklist(2),
    },
  });
  console.log("✓ demo pipeline: 3 organisations, 6 opportunities (1 confidential), 2 pitches");
}

async function main() {
  await seedLookups();
  await seedAdmin();
  if (process.argv.includes("--demo")) await seedDemo();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
