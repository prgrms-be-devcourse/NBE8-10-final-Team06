-- 0. 테이블이 없을 경우 생성 (부모 테이블 먼저)
CREATE TABLE IF NOT EXISTS tech_category (
                                             category_id BIGINT PRIMARY KEY,
                                             category_name VARCHAR(255) NOT NULL,
    color VARCHAR(50)
    );

CREATE TABLE IF NOT EXISTS technology (
                                          tech_id BIGINT PRIMARY KEY,
                                          tech_name VARCHAR(255) NOT NULL,
    category_id BIGINT REFERENCES tech_category(category_id),
    color VARCHAR(50)
    );

-- 1. 카테고리 데이터 먼저 삽입 (부모 테이블)
TRUNCATE TABLE tech_category RESTART IDENTITY CASCADE;

INSERT INTO tech_category (category_id, category_name, color) VALUES
                                                                  (1, 'Programming Languages', '#FFFFFF'),
                                                                  (2, 'Web Frameworks', '#FFFFFF'),
                                                                  (3, 'Databases', '#FFFFFF'),
                                                                  (4, 'Cloud & Tools', '#FFFFFF');

-- 2. Category 1: Programming Languages (1~42)
INSERT INTO technology (tech_id, tech_name, category_id, color) VALUES
                                                                    (1, 'JavaScript', 1, '#F7DF1E'), (2, 'HTML/CSS', 1, '#E34F26'), (3, 'SQL', 1, '#003B57'),
                                                                    (4, 'Python', 1, '#3776AB'), (5, 'Bash/Shell', 1, '#4EAA25'), (6, 'TypeScript', 1, '#3178C6'),
                                                                    (7, 'C#', 1, '#178600'), (8, 'Java', 1, '#007396'), (9, 'PowerShell', 1, '#5391FE'),
                                                                    (10, 'C++', 1, '#00599C'), (11, 'C', 1, '#A8B9CC'), (12, 'PHP', 1, '#777BB4'),
                                                                    (13, 'Go', 1, '#00ADD8'), (14, 'Rust', 1, '#000000'), (15, 'Kotlin', 1, '#7F52FF'),
                                                                    (16, 'Lua', 1, '#000080'), (17, 'Ruby', 1, '#CC342D'), (18, 'Dart', 1, '#0175C2'),
                                                                    (19, 'Assembly', 1, '#6E4C13'), (20, 'Swift', 1, '#F05138'), (21, 'Groovy', 1, '#4298B8'),
                                                                    (22, 'Visual Basic (.Net)', 1, '#512BD4'), (23, 'Perl', 1, '#39457E'), (24, 'R', 1, '#276DC3'),
                                                                    (25, 'VBA', 1, '#867DB1'), (26, 'GDScript', 1, '#478CBF'), (27, 'Scala', 1, '#DC322F'),
                                                                    (28, 'Elixir', 1, '#6E4A7E'), (29, 'MATLAB', 1, '#E16737'), (30, 'Delphi', 1, '#B22222'),
                                                                    (31, 'Lisp', 1, '#3FB5E5'), (32, 'Zig', 1, '#F7A41D'), (33, 'MicroPython', 1, '#76E05E'),
                                                                    (34, 'Erlang', 1, '#A90533'), (35, 'F#', 1, '#B845FC'), (36, 'Ada', 1, '#02509A'),
                                                                    (37, 'Gleam', 1, '#FFAAFF'), (38, 'Fortran', 1, '#4D41B1'), (39, 'OCaml', 1, '#ECB033'),
                                                                    (40, 'Prolog', 1, '#74283C'), (41, 'COBOL', 1, '#005CAB'), (42, 'Mojo', 1, '#FF4B4B');

-- 3. Category 2: Web Frameworks & Technologies (43~70)
INSERT INTO technology (tech_id, tech_name, category_id, color) VALUES
                                                                    (43, 'Node.js', 2, '#339933'), (44, 'React', 2, '#61DAFB'), (45, 'jQuery', 2, '#0769AD'),
                                                                    (46, 'Next.js', 2, '#000000'), (47, 'Express', 2, '#000000'), (48, 'ASP.NET Core', 2, '#512BD4'),
                                                                    (49, 'Angular', 2, '#DD0031'), (50, 'Vue.js', 2, '#4FC08D'), (51, 'FastAPI', 2, '#05998B'),
                                                                    (52, 'Spring Boot', 2, '#6DB33F'), (53, 'Flask', 2, '#000000'), (54, 'ASP.NET', 2, '#70147A'),
                                                                    (55, 'WordPress', 2, '#21759B'), (56, 'Django', 2, '#092E20'), (57, 'Laravel', 2, '#FF2D20'),
                                                                    (58, 'AngularJS', 2, '#E23237'), (59, 'Svelte', 2, '#FF3E00'), (60, 'Blazor', 2, '#512BD4'),
                                                                    (61, 'NestJS', 2, '#E0234E'), (62, 'Ruby on Rails', 2, '#CC0000'), (63, 'Astro', 2, '#FF5D01'),
                                                                    (64, 'Deno', 2, '#000000'), (65, 'Symfony', 2, '#000000'), (66, 'Nuxt.js', 2, '#00C58E'),
                                                                    (67, 'Fastify', 2, '#000000'), (68, 'Axum', 2, '#000000'), (69, 'Phoenix', 2, '#FD4F00'),
                                                                    (70, 'Drupal', 2, '#0077C0');

-- 4. Category 3: Databases (71~100)
INSERT INTO technology (tech_id, tech_name, category_id, color) VALUES
                                                                    (71, 'PostgreSQL', 3, '#4169E1'), (72, 'MySQL', 3, '#4479A1'), (73, 'SQLite', 3, '#003B57'),
                                                                    (74, 'Microsoft SQL Server', 3, '#CC2927'), (75, 'Redis', 3, '#DC382D'), (76, 'MongoDB', 3, '#47A248'),
                                                                    (77, 'MariaDB', 3, '#003545'), (78, 'Elasticsearch', 3, '#005571'), (79, 'Oracle', 3, '#F80000'),
                                                                    (80, 'DynamoDB', 3, '#4053D6'), (81, 'BigQuery', 3, '#669DF6'), (82, 'Supabase (DB)', 3, '#3ECF8E'),
                                                                    (83, 'Cloud Firestore', 3, '#FFCA28'), (84, 'H2', 3, '#5D6B73'), (85, 'Firebase Realtime Database', 3, '#FFA000'),
                                                                    (86, 'Microsoft Access', 3, '#A4373A'), (87, 'Cosmos DB', 3, '#3FAFB5'), (88, 'Snowflake', 3, '#29B5E8'),
                                                                    (89, 'InfluxDB', 3, '#22ADF6'), (90, 'Databricks SQL', 3, '#FF3621'), (91, 'DuckDB', 3, '#FFF000'),
                                                                    (92, 'Cassandra', 3, '#1287B1'), (93, 'Neo4J', 3, '#008CC1'), (94, 'Valkey', 3, '#000000'),
                                                                    (95, 'Clickhouse', 3, '#FFCC01'), (96, 'IBM DB2', 3, '#052FAD'), (97, 'Amazon Redshift', 3, '#8C4FFF'),
                                                                    (98, 'Cockroachdb', 3, '#6933FF'), (99, 'Pocketbase', 3, '#B8DEE1'), (100, 'Datomic', 3, '#73AB3B');

-- 5. Category 4: Cloud & Tools (101~142)
INSERT INTO technology (tech_id, tech_name, category_id, color) VALUES
                                                                    (101, 'Docker', 4, '#2496ED'), (102, 'npm', 4, '#CB3837'), (103, 'Amazon Web Services (AWS)', 4, '#FF9900'),
                                                                    (104, 'Pip', 4, '#3776AB'), (105, 'Kubernetes', 4, '#326CE5'), (106, 'Microsoft Azure', 4, '#0089D6'),
                                                                    (107, 'Homebrew', 4, '#FBB03B'), (108, 'Vite', 4, '#646CFF'), (109, 'Google Cloud', 4, '#4285F4'),
                                                                    (110, 'Make', 4, '#000000'), (111, 'Yarn', 4, '#2C8EBB'), (112, 'Cloudflare', 4, '#F38020'),
                                                                    (113, 'NuGet', 4, '#004880'), (114, 'APT', 4, '#5391FE'), (115, 'Webpack', 4, '#8DD6F9'),
                                                                    (116, 'Terraform', 4, '#7B42BC'), (117, 'Maven (build tool)', 4, '#C71A36'), (118, 'Cargo', 4, '#E32D2D'),
                                                                    (119, 'Gradle', 4, '#02303A'), (120, 'pnpm', 4, '#F69220'), (121, 'Firebase', 4, '#FFCA28'),
                                                                    (122, 'Prometheus', 4, '#E6522C'), (123, 'Ansible', 4, '#EE0000'), (124, 'Podman', 4, '#892CA0'),
                                                                    (125, 'Chocolatey', 4, '#71D2FF'), (126, 'Composer', 4, '#885630'), (127, 'MSBuild', 4, '#6E4C13'),
                                                                    (128, 'Digital Ocean', 4, '#0080FF'), (129, 'Vercel', 4, '#000000'), (130, 'Poetry', 4, '#60A5FA'),
                                                                    (131, 'Datadog', 4, '#632CA6'), (132, 'Pacman', 4, '#FFFF00'), (133, 'Netlify', 4, '#00C7B7'),
                                                                    (134, 'Bun', 4, '#FBF0DF'), (135, 'Heroku', 4, '#430098'), (136, 'Ninja', 4, '#000000'),
                                                                    (137, 'Splunk', 4, '#000000'), (138, 'New Relic', 4, '#1CE783'), (139, 'Railway', 4, '#0B0D0E'),
                                                                    (140, 'IBM Cloud', 4, '#1261FE'), (141, 'Yandex Cloud', 4, '#FFCC00'), (142, 'GitHub Actions', 4, '#2088FF');