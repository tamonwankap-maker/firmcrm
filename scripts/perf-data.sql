-- Bulk synthetic data for performance testing. Run ONLY against a scratch database (bdcrm_perf) after migrate + seed --demo:
--   psql -h localhost -U bdcrm bdcrm_perf -f scripts/perf-data.sql
\timing on
CREATE TEMP TABLE th(w text); INSERT INTO th VALUES ('สยาม'),('ไทย'),('กรุงเทพ'),('พัฒนา'),('อุตสาหกรรม'),('พลังงาน'),('การค้า'),('ธนาคาร'),('ประกัน'),('อสังหา'),('เกษตร'),('ขนส่ง'),('เทคโน'),('สากล'),('รุ่งเรือง'),('มั่นคง');
CREATE TEMP TABLE en(w text); INSERT INTO en VALUES ('Siam'),('Thai'),('Bangkok'),('Global'),('Energy'),('Trading'),('Capital'),('Holdings'),('Logistics'),('Agro'),('Tech'),('Asia'),('Mekong'),('Royal'),('Golden'),('United');
INSERT INTO "Organisation"(id,"nameEn","nameTh","nameKey","nameThKey",type,status,country,"isKeyClient","createdAt","updatedAt")
SELECT 'po'||g, e1.w||' '||e2.w||' '||g||' Co., Ltd.', 'บริษัท '||t1.w||t2.w||' '||g||' จำกัด', lower(e1.w||' '||e2.w||' '||g), t1.w||t2.w||g,
  (ARRAY['CLIENT','PROSPECT','REFERRER','FOREIGN_LAW_FIRM'])[1+g%4]::"OrganisationType", 'ACTIVE', 'TH', g%50=0, now(), now()
FROM generate_series(1,10000) g
CROSS JOIN LATERAL (SELECT w FROM en OFFSET (g%16) LIMIT 1) e1
CROSS JOIN LATERAL (SELECT w FROM en OFFSET ((g/16)%16) LIMIT 1) e2
CROSS JOIN LATERAL (SELECT w FROM th OFFSET (g%16) LIMIT 1) t1
CROSS JOIN LATERAL (SELECT w FROM th OFFSET ((g/7)%16) LIMIT 1) t2;
INSERT INTO "Contact"(id,"nameEn","nameTh","nameKey",email,"organisationId","relationshipStrength","preferredLanguage","createdAt","updatedAt")
SELECT 'pc'||g, 'Person '||md5(g::text)::varchar(8), 'คุณ'||t.w||' '||g, 'person '||md5(g::text)::varchar(8), 'p'||g||'@example.co.th', 'po'||(1+g%10000), 1+g%5, 'EN', now(), now()
FROM generate_series(1,50000) g CROSS JOIN LATERAL (SELECT w FROM th OFFSET (g%16) LIMIT 1) t;
INSERT INTO "MailingConsent"(id,"contactId",list,"optedIn","consentDate",source,"createdAt","updatedAt")
SELECT 'pm'||g, 'pc'||g, 'NEWSLETTER', g%3<>0, current_date, 'WEB_FORM', now(), now() FROM generate_series(1,30000) g;
INSERT INTO "Activity"(id,type,date,"organisationId",summary,"nextAction","nextActionDue","ownerId","createdAt","updatedAt")
SELECT 'pa'||g, (ARRAY['MEETING','CALL','LUNCH','EMAIL'])[1+g%4]::"ActivityType", current_date - (g%700), 'po'||(1+g%10000),
  'Discussed matter '||g||' ประชุมเรื่องการลงทุน', CASE WHEN g%5=0 THEN 'Follow up '||g END, CASE WHEN g%5=0 THEN current_date + (g%30) - 10 END,
  (SELECT id FROM "User" ORDER BY id OFFSET (g%6) LIMIT 1), now(), now()
FROM generate_series(1,30000) g;
INSERT INTO "_ActivityContacts"("A","B") SELECT 'pa'||g, 'pc'||(1+g%50000) FROM generate_series(1,30000) g;
INSERT INTO "_ActivityAttendees"("A","B") SELECT id, "ownerId" FROM "Activity" WHERE id LIKE 'pa%';
INSERT INTO "Opportunity"(id,name,"organisationId",source,"leadPartnerId",stage,probability,"conflictStatus","feeEstimateMin","feeEstimateMax",currency,confidential,"outcomeReason","closedDate",competitors,"createdAt","updatedAt")
SELECT 'pp'||g, 'Matter '||g, 'po'||(1+g%10000), 'REFERRAL', (SELECT id FROM "User" WHERE role IN ('PARTNER','ADMIN') ORDER BY id OFFSET (g%3) LIMIT 1),
  (ARRAY['LEAD','QUALIFIED','PROPOSAL_PREPARING','SUBMITTED','WON','LOST'])[1+g%6]::"OpportunityStage", 30, 'CLEARED', 500000, 1500000, 'THB', g%10=0,
  CASE WHEN g%6 IN (4,5) THEN 'PRICE'::"OutcomeReason" END, CASE WHEN g%6 IN (4,5) THEN current_date - (g%300) END, '{}', now() - (g%400)*interval '1 day', now()
FROM generate_series(1,3000) g;
INSERT INTO "_OpportunityPracticeAreas"("A","B") SELECT 'pp'||g, (SELECT id FROM "PracticeArea" ORDER BY id OFFSET (g%12) LIMIT 1) FROM generate_series(1,3000) g;
INSERT INTO "Task"(id,title,"dueDate","ownerId",status,"organisationId","createdAt","updatedAt")
SELECT 'pt'||g, 'Task '||g, current_date + (g%60) - 20, (SELECT id FROM "User" ORDER BY id OFFSET (g%6) LIMIT 1), (ARRAY['OPEN','DONE'])[1+g%2]::"TaskStatus", 'po'||(1+g%10000), now(), now() FROM generate_series(1,10000) g;
ANALYZE;
SELECT (SELECT count(*) FROM "Organisation") orgs, (SELECT count(*) FROM "Contact") contacts, (SELECT count(*) FROM "Activity") activities, (SELECT count(*) FROM "Opportunity") opps;
