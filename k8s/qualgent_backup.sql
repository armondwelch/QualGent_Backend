--
-- PostgreSQL database dump
--

-- Dumped from database version 15.13 (Debian 15.13-1.pgdg120+1)
-- Dumped by pg_dump version 15.13 (Debian 15.13-1.pgdg120+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: browserstack_videos; Type: TABLE; Schema: public; Owner: qualgentuser
--

CREATE TABLE public.browserstack_videos (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    session_name character varying(500),
    build_id character varying(255),
    video_url character varying(1000),
    video_data bytea,
    file_size bigint,
    content_type character varying(100),
    status character varying(50) DEFAULT 'downloaded'::character varying,
    os character varying(50),
    os_version character varying(50),
    device character varying(200),
    duration integer,
    test_status character varying(50),
    public_url character varying(1000),
    dashboard_url character varying(1000),
    downloaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.browserstack_videos OWNER TO qualgentuser;

--
-- Name: browserstack_videos_id_seq; Type: SEQUENCE; Schema: public; Owner: qualgentuser
--

CREATE SEQUENCE public.browserstack_videos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.browserstack_videos_id_seq OWNER TO qualgentuser;

--
-- Name: browserstack_videos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: qualgentuser
--

ALTER SEQUENCE public.browserstack_videos_id_seq OWNED BY public.browserstack_videos.id;


--
-- Name: browserstack_videos id; Type: DEFAULT; Schema: public; Owner: qualgentuser
--

ALTER TABLE ONLY public.browserstack_videos ALTER COLUMN id SET DEFAULT nextval('public.browserstack_videos_id_seq'::regclass);


--
-- Data for Name: browserstack_videos; Type: TABLE DATA; Schema: public; Owner: qualgentuser
--

COPY public.browserstack_videos (id, session_id, session_name, build_id, video_url, video_data, file_size, content_type, status, os, os_version, device, duration, test_status, public_url, dashboard_url, downloaded_at, created_at) FROM stdin;
1	507d35a2a40fb9d91736e047c849ef12d5dbe908	Open Playwright on Wikipedia and verify Microsoft is visible	f98f33ea969b0aac2aedda2fd3b62d3af6d528af	https://app-automate.browserstack.com/sessions/507d35a2a40fb9d91736e047c849ef12d5dbe908/video?token=N0ZIT2oySlVDVS9uQlQ2Y0k2UWdJblpGckJkRzkwMTBuWXlVU1UzYlprOUhoNk9jdmFCTkRyTFNrcUNJNHh0WVNrRktibWpoeEFKM3YxSnN2SEluRnc9PS0teHVpUU9OU3g5K3RkbytzeXdGYzdHdz09--066b449a081dedb973927011e6073428c403e11e&source=rest_api&diff=22.143826653	\N	0	video/mp4	metadata_only	android	14.0	Google Pixel 8	30	passed	https://app-automate.browserstack.com/builds/f98f33ea969b0aac2aedda2fd3b62d3af6d528af/sessions/507d35a2a40fb9d91736e047c849ef12d5dbe908?auth_token=a3ccc2466a35df10986d8873d4d8e2cfeb2e37a41c2f2cf2c7b39168b32ab345	https://app-automate.browserstack.com/dashboard/v2/sessions/507d35a2a40fb9d91736e047c849ef12d5dbe908	2025-07-20 14:45:04.273996	2025-07-20 14:45:04.273996
2	1f570c76c33fbd39b1dd988e6722e37bf086ccb3	Open Playwright on Wikipedia and verify Microsoft is visible	f98f33ea969b0aac2aedda2fd3b62d3af6d528af	https://app-automate.browserstack.com/sessions/1f570c76c33fbd39b1dd988e6722e37bf086ccb3/video?token=dkVuK21mUzRoOVRBN2thWkpLUm9BVUhmcFJpN3I1WDIrbVBvQ0U1MkI1YkZIR0tjdXZsWnN3TUMwdmpVU3gwZ3Q2L01qU25hRnlGUnlXUk5FUUk5Ymc9PS0tTE96ajJ2M1U2UFp3M3JLUzVzRUF2dz09--6958163a4b29fb56f649cdfa434b21e2061dbe03&source=rest_api&diff=24.392963609	\N	0	video/mp4	video_url_stored	android	14.0	Google Pixel 8	29	passed	https://app-automate.browserstack.com/builds/f98f33ea969b0aac2aedda2fd3b62d3af6d528af/sessions/1f570c76c33fbd39b1dd988e6722e37bf086ccb3?auth_token=e5234d9c674cb4bbdb2cfe649c3d429b2ca4c6eeba5d51cad426f5fa17ca7ae7	https://app-automate.browserstack.com/dashboard/v2/sessions/1f570c76c33fbd39b1dd988e6722e37bf086ccb3	2025-07-20 15:00:24.932499	2025-07-20 15:00:24.932499
3	aced86ace0d4fcbb7de66e06c62fccd5d24dfaaf	Open Playwright on Wikipedia and verify Microsoft is visible	f98f33ea969b0aac2aedda2fd3b62d3af6d528af	https://app-automate.browserstack.com/sessions/aced86ace0d4fcbb7de66e06c62fccd5d24dfaaf/video?token=NUh5WlJSOHpycU13ODdDaGZUZlE5dmMzN0NFdTBZM1AzZW9vSTR3RFRPblVad1B0cnhOUGFyZUJhaU16RWsyR1htZkwwSXkxYnVjemZtcHkvbFFMWGc9PS0tcjg4L2tNWnZRNEUrTmRERHp4clc5UT09--24a3d7918e2c838d2da99a998be28405ed77a815&source=rest_api&diff=14.682970337	\N	0	video/mp4	video_url_stored	android	14.0	Google Pixel 8	37	passed	https://app-automate.browserstack.com/builds/f98f33ea969b0aac2aedda2fd3b62d3af6d528af/sessions/aced86ace0d4fcbb7de66e06c62fccd5d24dfaaf?auth_token=33685d37004d78d061882ae156f7b32210a82742cd94a342bcec470c39dc1c6b	https://app-automate.browserstack.com/dashboard/v2/sessions/aced86ace0d4fcbb7de66e06c62fccd5d24dfaaf	2025-07-20 15:23:01.105514	2025-07-20 15:23:01.105514
4	27b3306e22750ff9ca2f83888ac5f8ed1a149469	Open Playwright on Wikipedia and verify Microsoft is visible	f98f33ea969b0aac2aedda2fd3b62d3af6d528af	https://app-automate.browserstack.com/sessions/27b3306e22750ff9ca2f83888ac5f8ed1a149469/video?token=VVhNOER6OVdOWHgyZHAvVGZDeS9BSmN3R3JFY2Mzbm9rYkxuMGdTd1hIZ3NxWnBVbHVtTmFUaXZRNlRFNDR2bDN4SzlhODZwb0lnYXh1QlF6b1RBeGc9PS0tdWV1MWlWYW0zbHNKTk5OU0pkMTY1UT09--2a5be8a1c84aea38d6071e2834a208cf142c33d0&source=rest_api&diff=22.545875605	\N	0	video/mp4	video_url_stored	android	14.0	Google Pixel 8	30	passed	https://app-automate.browserstack.com/builds/f98f33ea969b0aac2aedda2fd3b62d3af6d528af/sessions/27b3306e22750ff9ca2f83888ac5f8ed1a149469?auth_token=7314c9d6948c9877b8ed00e28ab6deef0856a223948028548addc305770af387	https://app-automate.browserstack.com/dashboard/v2/sessions/27b3306e22750ff9ca2f83888ac5f8ed1a149469	2025-07-20 21:43:54.743985	2025-07-20 21:43:54.743985
5	90588923adfdcc1cb8768131ef9895851fc0a457	app ios test	57683b7fb79a0e30482321a0c44f9db125d50963	https://app-automate.browserstack.com/sessions/90588923adfdcc1cb8768131ef9895851fc0a457/video?token=SDhYYVNLNmZ2Mll4TnpjU3RvRjdOWmlxbzlQdlpMdURsMHdqMkRNNFNKTlJ6SHZyejdvY2QybXZqN3FaUHZianhocmlWTXVpMzY2RFgyZTdVOFpnRnc9PS0tT0ZZQVFWUzhUMUU2Y3VVMGY3cTdJQT09--9bdb21d3009a315ffb744ec18bf4b6b10d27e97a&source=rest_api&diff=-1	\N	0	video/mp4	video_url_stored	ios	16.4	iPhone 14	\N	running	https://app-automate.browserstack.com/builds/57683b7fb79a0e30482321a0c44f9db125d50963/sessions/90588923adfdcc1cb8768131ef9895851fc0a457?auth_token=bd583d78e48675c0c81ef26e8604ef5f8e12decd21af769bf81a979a7ec16d5a	https://app-automate.browserstack.com/dashboard/v2/sessions/90588923adfdcc1cb8768131ef9895851fc0a457	2025-07-21 02:05:32.463206	2025-07-21 02:05:32.463206
6	2cabcfbe9da4a2f22617ca1d781ccb4b5db4f965	Open Playwright on Wikipedia and verify Microsoft is visible	57683b7fb79a0e30482321a0c44f9db125d50963	https://app-automate.browserstack.com/sessions/2cabcfbe9da4a2f22617ca1d781ccb4b5db4f965/video?token=b0VyVXFPdGRubWRmRHhjMWtkb0x3S2ttRDBTZWQyMVY1cUQ5ZG8vU2pybVhHczhzOWx2UmZzS2RkdU44TlR0bU1oMHhCMFhlQXZaai9nNy9QRVpnb1E9PS0tbWtSQ3ZQVHd3R2t2bEM1aHh3WkxZdz09--3ee9dd6943789111f4be45ae2af6838f1916aef3&source=rest_api&diff=19.350195362	\N	0	video/mp4	video_url_stored	ios	16.4	iPhone 14	190	failed	https://app-automate.browserstack.com/builds/57683b7fb79a0e30482321a0c44f9db125d50963/sessions/2cabcfbe9da4a2f22617ca1d781ccb4b5db4f965?auth_token=40b9effdedb213a5faa0e382d8c4d4f23a3e37830d6fdc20736b2f60aa2a4bc4	https://app-automate.browserstack.com/dashboard/v2/sessions/2cabcfbe9da4a2f22617ca1d781ccb4b5db4f965	2025-07-21 02:42:48.53557	2025-07-21 02:42:48.53557
7	b2a314ef453509b7061800da2c5c87192b6b5c8c	Open Playwright on Wikipedia and verify Microsoft is visible	57683b7fb79a0e30482321a0c44f9db125d50963	https://app-automate.browserstack.com/sessions/b2a314ef453509b7061800da2c5c87192b6b5c8c/video?token=M096OXBSQWdpbjhqS1dteTBSWStsKzc4ZEJBYk5LTDZIdmYyQ1dkTVFBQ0JaTVdGU2FDMkQ5RmhhRkMvd2tWdWNXK3E5Z3h3ZmoveHpwUXo1Zm5aTmc9PS0tWlN5MDM5bkYxREY1WTR4YWg2azhmZz09--18f020e75a4582563b55d8d13b3904e1cecb0513&source=rest_api&diff=145.714700754	\N	0	video/mp4	video_url_stored	ios	16.4	iPhone 14	137	failed	https://app-automate.browserstack.com/builds/57683b7fb79a0e30482321a0c44f9db125d50963/sessions/b2a314ef453509b7061800da2c5c87192b6b5c8c?auth_token=7489372648f234d314beb9949e669d36a1f0a1becd151c70afb1115965792fa1	https://app-automate.browserstack.com/dashboard/v2/sessions/b2a314ef453509b7061800da2c5c87192b6b5c8c	2025-07-21 02:49:07.85326	2025-07-21 02:49:07.85326
\.


--
-- Name: browserstack_videos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: qualgentuser
--

SELECT pg_catalog.setval('public.browserstack_videos_id_seq', 7, true);


--
-- Name: browserstack_videos browserstack_videos_pkey; Type: CONSTRAINT; Schema: public; Owner: qualgentuser
--

ALTER TABLE ONLY public.browserstack_videos
    ADD CONSTRAINT browserstack_videos_pkey PRIMARY KEY (id);


--
-- Name: browserstack_videos browserstack_videos_session_id_key; Type: CONSTRAINT; Schema: public; Owner: qualgentuser
--

ALTER TABLE ONLY public.browserstack_videos
    ADD CONSTRAINT browserstack_videos_session_id_key UNIQUE (session_id);


--
-- Name: idx_build_id; Type: INDEX; Schema: public; Owner: qualgentuser
--

CREATE INDEX idx_build_id ON public.browserstack_videos USING btree (build_id);


--
-- Name: idx_downloaded_at; Type: INDEX; Schema: public; Owner: qualgentuser
--

CREATE INDEX idx_downloaded_at ON public.browserstack_videos USING btree (downloaded_at DESC);


--
-- Name: idx_session_id; Type: INDEX; Schema: public; Owner: qualgentuser
--

CREATE INDEX idx_session_id ON public.browserstack_videos USING btree (session_id);


--
-- PostgreSQL database dump complete
--

