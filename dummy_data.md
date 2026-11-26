USE campuspath_db;

-- Optional: Clear previous test rows so IDs start cleanly at 1
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Rooms;
TRUNCATE TABLE Building;
TRUNCATE TABLE Departments;
TRUNCATE TABLE Locations;
TRUNCATE TABLE Users;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Sample Users (Student & Admin)
INSERT INTO Users (name, email, password, role) VALUES
('Albert Christian C. Reyna', 'albert.reyna@cit.edu', '123456', 'ADMIN'),
('John Emmanuel B. Montemayor', 'john.montemayor@cit.edu', '123456', 'STUDENT');

-- 2. Locations (All Buildings, Facilities & Offices from CIT-U Vicinity Map)
INSERT INTO Locations (name, DESCRIPTION, type) VALUES
('NGE BLDG', 'New Generation Engineering / Computer Studies Building (South Campus)', 'Building'),
('RTL BLDG', 'Rizal Technological / Main Academic Building housing FAO, ETO, OAS, and GDNC/TEST', 'Building'),
('GLE BLDG', 'Gregorio L. Escario Building (East Campus)', 'Building'),
('ACAD BLDG', 'Academic Building (East Campus)', 'Building'),
('LRAC', 'Learning Resource and Activity Center', 'Building'),
('G-PHYSLAB', 'General Physics Laboratory Building', 'Building'),
('ALLIED BLDG', 'Allied Engineering / Health Sciences Building (West Campus)', 'Building'),
('LINK', 'Campus Connecting Corridor between Allied/LRAC and SAL Building', 'Facility'),
('SAL BLDG', 'Science and Arts Laboratory Building (Northwest Campus)', 'Building'),
('P.E AREA', 'Physical Education Open Activity Area', 'Facility'),
('GYM', 'CIT-U Gymnasium (Northwest Campus)', 'Facility'),
('ELEM BLDG', 'Elementary Department Building (North Campus)', 'Building'),
('CCS Faculty Office', 'College of Computer Studies Faculty Office inside NGE Building', 'Office'),
('FAO', 'Finance and Accounting Office (RTL Building)', 'Office'),
('ETO', 'Enrollment Technical Office (RTL Building)', 'Office'),
('OAS', 'Office of Admission and Scholarship (RTL Building)', 'Office'),
('GDNC / TEST', 'Guidance Center / Testing Area (RTL Building)', 'Office');

-- 3. Departments (From Vicinity Map Legend)
INSERT INTO Departments (department_name, description) VALUES
('College of Computer Studies', 'Department of Information Technology and Computer Science'),
('College of Nursing and Allied Health Sciences', 'Allied Health and Nursing Programs'),
('College of Management, Business & Accountancy', 'Business, Management, and Accountancy Programs'),
('College of Arts, Sciences, & Education', 'General Education, Arts, Sciences, and Teacher Education'),
('College of Engineering & Architecture', 'Engineering and Architecture Programs'),
('College of Criminal Justice', 'Criminology and Criminal Justice Programs');

-- 4. Buildings (Linked to Location IDs 1–12 from Vicinity Map)
INSERT INTO Building (building_name, description, location_id) VALUES
('NGE BLDG', 'Houses Wildcat Innovation Play Lab, CCS Faculty Office, and NGE Classrooms (Floors 1 to 3)', 1),
('RTL BLDG', 'Main quadrangle building housing FAO, ETO, OAS, GDNC/TEST, and classrooms (Floors 1 to 4)', 2),
('GLE BLDG', 'East-wing academic building beside ACAD BLDG (Floors 1 to 4)', 3),
('ACAD BLDG', 'Main academic lecture building on the east side of campus (Floors 1 to 4)', 4),
('LRAC', 'Central Learning Resource and Activity Center (Floors 1 to 3)', 5),
('G-PHYSLAB', 'Physics laboratory building adjacent to LRAC (Floors 1 to 2)', 6),
('ALLIED BLDG', 'West-wing academic and laboratory building (Floors 1 to 3)', 7),
('LINK', 'Connecting hallway linking west-wing buildings to SAL BLDG (Floor 1)', 8),
('SAL BLDG', 'Northwest academic and laboratory building near GYM and P.E AREA (Floors 1 to 3)', 9),
('P.E AREA', 'Outdoor Physical Education court and activity area', 10),
('GYM', 'Main indoor gymnasium and sports complex (Floors 1 to 2)', 11),
('ELEM BLDG', 'Elementary school building at the north end of campus (Floors 1 to 3)', 12);

-- 5. Rooms with Floor Levels across Vicinity Map Buildings
INSERT INTO Rooms (building_id, department_id, room_number, room_name, floor) VALUES
-- NGE BLDG (building_id = 1, Floors 1 to 3)
(1, 1, '101', 'NGE 101', 1),
(1, 1, '102', 'NGE 102', 1),
(1, 1, '103', 'NGE 103', 1),
(1, 1, '104', 'NGE 104', 1),
(1, 1, '105', 'NGE 105', 1),
(1, 1, 'LAB-1', 'Wildcat Innovation Play Lab', 1),
(1, 1, '201', 'NGE 201', 2),
(1, 1, '202', 'NGE 202', 2),
(1, 1, '203', 'NGE 203', 2),
(1, 1, '204', 'NGE 204', 2),
(1, 1, '205', 'NGE 205', 2),
(1, 1, '301', 'NGE 301', 3),
(1, 1, '302', 'NGE 302', 3),
(1, 1, '303', 'NGE 303', 3),
(1, 1, '304', 'NGE 304', 3),
(1, 1, '305', 'NGE 305', 3),
(1, 1, 'FAC-CCS', 'CCS Faculty Office', 3),

-- RTL BLDG (building_id = 2, Floors 1 to 4)
(2, 3, 'RTL-101', 'FAO - Finance and Accounting Office', 1),
(2, 3, 'RTL-102', 'ETO - Enrollment Technical Office', 1),
(2, 3, 'RTL-103', 'OAS - Office of Admission and Scholarship', 1),
(2, 3, 'RTL-104', 'GDNC / TEST - Guidance Center / Testing Area', 1),
(2, 3, 'RTL-201', 'RTL Lecture Room 201', 2),
(2, 3, 'RTL-202', 'RTL Lecture Room 202', 2),
(2, 3, 'RTL-301', 'CMBA Faculty & Seminar Room 301', 3),
(2, 3, 'RTL-401', 'RTL Case Study Room 401', 4),

-- GLE BLDG (building_id = 3, Floors 1 to 4)
(3, 5, 'GLE-101', 'GLE Engineering Room 101', 1),
(3, 5, 'GLE-201', 'GLE Drafting Studio 201', 2),
(3, 5, 'GLE-301', 'GLE Architecture Studio 301', 3),
(3, 5, 'GLE-401', 'GLE Design Lab 401', 4),

-- ACAD BLDG (building_id = 4, Floors 1 to 4)
(4, 4, 'ACAD-101', 'ACAD Lecture Hall 101', 1),
(4, 6, 'ACAD-201', 'Criminal Justice Moot Court 201', 2),
(4, 5, 'ACAD-301', 'Engineering Lecture Room 301', 3),
(4, 4, 'ACAD-401', 'CASE Graduate Lecture Room 401', 4),

-- LRAC (building_id = 5, Floors 1 to 3)
(5, 4, 'LRAC-101', 'Main Library & Learning Commons', 1),
(5, 4, 'LRAC-201', 'Periodicals & Quiet Study Zone', 2),
(5, 4, 'LRAC-301', 'Audio-Visual & Multimedia Hall', 3),

-- G-PHYSLAB (building_id = 6, Floors 1 to 2)
(6, 4, 'PHYS-101', 'General Physics Laboratory 101', 1),
(6, 4, 'PHYS-201', 'Electronics & Optics Laboratory 201', 2),

-- ALLIED BLDG (building_id = 7, Floors 1 to 3)
(7, 2, 'ALLIED-101', 'Nursing Skills Laboratory 101', 1),
(7, 2, 'ALLIED-201', 'Allied Health Lecture Room 201', 2),
(7, 2, 'ALLIED-301', 'Clinical Simulation Ward 301', 3),

-- SAL BLDG (building_id = 9, Floors 1 to 3)
(9, 4, 'SAL-101', 'General Chemistry Laboratory 101', 1),
(9, 4, 'SAL-201', 'Biology & Microbiology Laboratory 201', 2),
(9, 4, 'SAL-301', 'Natural Sciences Lecture Room 301', 3),

-- GYM (building_id = 11, Floors 1 to 2)
(11, 4, 'GYM-101', 'Main Gymnasium Court', 1),
(11, 4, 'GYM-201', 'Upper Bleachers & Fitness Studio', 2),

-- ELEM BLDG (building_id = 12, Floors 1 to 3)
(12, 4, 'ELEM-101', 'Elementary Classroom 101 (Grades 1–2)', 1),
(12, 4, 'ELEM-201', 'Elementary Classroom 201 (Grades 3–4)', 2),
(12, 4, 'ELEM-301', 'Elementary Classroom 301 (Grades 5–6)', 3);