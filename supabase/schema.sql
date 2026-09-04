-- ===========================================================================
-- All About Pawz — Supabase schema + seed data
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- After running, set these in your .env:
--   SUPABASE_URL=https://<project>.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY=...   (Project Settings → API → service_role)
--   SUPABASE_ANON_KEY=...           (Project Settings → API → anon)
-- Then create a PUBLIC storage bucket named "cms-media" for image uploads.
-- Column names are quoted camelCase so the CMS frontend types stay identical.
-- ===========================================================================

-- ---------- tables ----------
create table if not exists services (
  id text primary key default gen_random_uuid()::text,
  "title" text not null,
  "description" text not null,
  "icon" text default 'Scissors',
  "image" text,
  "alt" text,
  "order" int default 0,
  "visible" boolean default true,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists products (
  id text primary key default gen_random_uuid()::text,
  "name" text not null,
  "price" text not null,
  "image" text,
  "alt" text,
  "description" text,
  "badge" text,
  "order" int default 0,
  "visible" boolean default true,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists gallery_photos (
  id text primary key default gen_random_uuid()::text,
  "alt" text not null,
  "category" text default 'GROOMING',
  "image" text not null,
  "order" int default 0,
  "visible" boolean default true,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists pricing_packages (
  id text primary key default gen_random_uuid()::text,
  "name" text not null,
  "smallPrice" text,
  "mediumPrice" text,
  "largePrice" text,
  "xlargePrice" text,
  "description" text,
  "featured" boolean default false,
  "order" int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists add_ons (
  id text primary key default gen_random_uuid()::text,
  "title" text not null,
  "price" text,
  "icon" text default 'Sparkles',
  "order" int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists faqs (
  id text primary key default gen_random_uuid()::text,
  "question" text not null,
  "answer" text not null,
  "order" int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists policies (
  id text primary key default gen_random_uuid()::text,
  "title" text not null,
  "body" text not null,
  "order" int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists testimonials (
  id text primary key default gen_random_uuid()::text,
  "quote" text not null,
  "author" text,
  "rating" int default 5,
  "visible" boolean default true,
  "order" int default 0,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists bookings (
  id text primary key default gen_random_uuid()::text,
  "ownerName" text not null,
  "dogName" text,
  "breed" text,
  "service" text,
  "size" text default 'SMALL',
  "date" text,
  "time" text,
  "notes" text,
  "phone" text,
  "email" text,
  "status" text default 'PENDING',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists consultations (
  id text primary key default gen_random_uuid()::text,
  "name" text not null,
  "dogName" text,
  "breed" text,
  "concerns" text,
  "preferredTime" text,
  "phone" text,
  "email" text,
  "status" text default 'PENDING',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists contact_messages (
  id text primary key default gen_random_uuid()::text,
  "name" text not null,
  "email" text,
  "subject" text,
  "message" text,
  "status" text default 'UNREAD',
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create table if not exists newsletter (
  id text primary key default gen_random_uuid()::text,
  "email" text not null,
  "createdAt" timestamptz default now()
);

create table if not exists site_settings (
  "key" text primary key,
  "value" text,
  "updatedAt" timestamptz default now()
);

-- ---------- seed data (matches the live site content) ----------
insert into services ("title","description","icon","image","alt","order") values
 ('GROOMING','Haircuts, styling, and full grooms','Scissors','/assets/svc-groom.jpg','Groomer trimming a dog''s coat with scissors',0),
 ('BATH & SPA','De-shedding, deep cleanse, and more','Bath','/assets/svc-bath.jpg','Small dog enjoying a bubble bath',1),
 ('NAIL & PAW CARE','Nail trims, paw balm, and pawdicures','PawPrint','/assets/svc-nails.jpg','Dog''s nails being trimmed',2),
 ('ADD-ON SERVICES','Teeth brushing, de-tangling, fragrance & more','Droplets','/assets/svc-addon.jpg','Paw balm being applied to a dog''s paw',3)
on conflict do nothing;

insert into products ("name","price","image","alt","badge","order") values
 ('Pawz Signature Shampoo','$34.00','/assets/product-shampoo.jpg','Pawz signature shampoo bottle','Bestseller',0),
 ('Coat Conditioning Spray','$22.00','/assets/product-spray.jpg','Coat conditioning spray bottle',null,1),
 ('Grooming Brush','$26.00','/assets/product-brush.jpg','Wooden grooming brush',null,2),
 ('Pawz Bandana','$16.00','/assets/product-bandana.jpg','Black dog bandana with gold paw',null,3)
on conflict do nothing;

insert into gallery_photos ("alt","category","image","order") values
 ('Cream cockapoo with a bow tie','GROOMING','/assets/g1.jpg',0),
 ('Apricot cockapoo portrait','TRANSFORMATIONS','/assets/g2.jpg',1),
 ('Smiling corgi','BATH & SPA','/assets/g3.jpg',2),
 ('Golden retriever with tongue out','GROOMING','/assets/g4.jpg',3),
 ('Black poodle mix portrait','TRANSFORMATIONS','/assets/g5.jpg',4),
 ('Apricot labradoodle sitting','GROOMING','/assets/g6.jpg',5),
 ('Salt and pepper schnauzer','BATH & SPA','/assets/g7.jpg',6),
 ('Cream goldendoodle puppy','TRANSFORMATIONS','/assets/g8.jpg',7)
on conflict do nothing;

insert into pricing_packages ("name","smallPrice","mediumPrice","largePrice","xlargePrice","featured","order") values
 ('Bath & Brush','$75','$95','$115','$135',false,0),
 ('Full Groom','$95','$115','$135','$155',true,1),
 ('Deluxe Spa','$125','$145','$165','$185',false,2)
on conflict do nothing;

insert into add_ons ("title","price","icon","order") values
 ('Teeth Brushing','$15','Sparkles',0),
 ('De-shedding','$15 - $35','Scissors',1),
 ('Paw Treatment','$15','PawPrint',2),
 ('Nail Trim','$15','Droplets',3),
 ('Flea Bath','$10','Bug',4)
on conflict do nothing;

insert into faqs ("question","answer","order") values
 ('How often should my dog be groomed?','Most coats do best on a four to six week schedule. Doodles, poodles, and other curly coats benefit from every four weeks to prevent matting, while short smooth coats can comfortably stretch to eight weeks.',0),
 ('How long does an appointment take?','A full groom typically takes two to three hours depending on size, coat condition, and the services selected. We groom one dog at a time so your pup is never left in a kennel waiting.',1),
 ('Do you use cage dryers?','Never. Every dog is hand dried and hand finished by their groomer from start to finish.',2),
 ('What products do you use?','Salon exclusive, sulphate free, plant based shampoos and conditioners selected for each coat and skin type.',3),
 ('Can I stay with my dog during the groom?','We ask parents to step out during the groom. Most dogs settle far more quickly without an audience.',4),
 ('Do you groom senior dogs or dogs with anxiety?','Yes. We offer a gentle, low stress approach with breaks built in, and we will happily split services across visits.',5)
on conflict do nothing;

insert into policies ("title","body","order") values
 ('CANCELLATIONS','Please give 24 hours notice to cancel or reschedule. Cancellations inside 24 hours are subject to a 50% service fee.',0),
 ('LATE ARRIVALS','Arrivals more than 15 minutes late may need to be rescheduled so we can honour the appointments that follow.',1),
 ('VACCINATIONS','Current rabies and distemper records are required for every dog on their first visit.',2),
 ('MATTED COATS','Humanity before vanity. Severely matted coats may require a short clip, and de-matting is charged in 15 minute increments.',3)
on conflict do nothing;

insert into testimonials ("quote","author","rating","order") values
 ('The best grooming experience we''ve ever had! My dog always comes home happy and handsome.','Jessica M. & Cooper',5,0),
 ('From the moment you walk in, you feel the love they put into every detail.','Daniel R. & Olive',5,1),
 ('Booked the Deluxe Spa for our doodle and the results were stunning.','Priya S. & Maple',5,2)
on conflict do nothing;

insert into site_settings ("key","value") values
 ('brandName','All About Pawz'),
 ('tagline','From Pawz to PAWfection'),
 ('heroTitle','Luxury Grooming. Exceptional Care.'),
 ('heroSubtitle','We deliver a spa-level grooming experience where every detail is designed for your pup''s comfort, style, and happiness.'),
 ('addressLine1','1428 Maple Grove Avenue'),
 ('addressLine2','Suite 4, Riverbend, IL 60614'),
 ('phone','(312) 555-0142'),
 ('email','hello@allaboutpawz.com'),
 ('hoursTueSat','9am – 6pm'),
 ('hoursSun','10am – 4pm'),
 ('hoursMon','Closed'),
 ('instagram','https://instagram.com'),
 ('facebook','https://facebook.com'),
 ('footerNote','© 2024 All About Pawz LLC. All rights reserved.')
on conflict do nothing;

-- ---------- storage bucket ----------
insert into storage.buckets (id, name, public) values ('cms-media','cms-media',true)
on conflict do nothing;
