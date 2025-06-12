-- Insert the ESG course
INSERT INTO courses (title, description, price) VALUES (
    'How ESG works in business',
    'This beginner-level course provides an introduction to Environmental, Social, and Governance (ESG) principles and their role in modern business. Learners will explore the fundamentals of ESG, understand its importance for businesses, stakeholders, and society, and discover how ESG strategies can drive sustainability, transparency, and long-term business success.

By the end of this course, participants will gain the knowledge and tools needed to apply ESG principles to business decision-making and strategy and greenhouse gas emissions

Who is this course for?
- Beginners
- Business professionals looking to understand ESG.
- Students or individuals interested in sustainability and corporate responsibility.
- Entrepreneurs and small business owners

Learning Objectives
By the end of this course, participants will:
- Understand the concept of ESG and its key components.
- Learn why ESG matters to businesses, investors, and society.
- Explore how businesses integrate ESG into their strategies and operations
- Understand where to start their ESG assessments from - materiality assessment
- Learn what metrics are used in ESG reporting 
- Learn and calculate their greenhouse gas emissions (carbon emission) and social performance
- Analyze the results and set up mitigation strategies',
    500.00
);

-- Get the course ID
SET @course_id = LAST_INSERT_ID();

-- Insert chapters
INSERT INTO chapters (course_id, title, description, order_index) VALUES
(@course_id, 'Introduction and importance of ESG in the global business context', 
'Meaning of ESG 
History of ESG 
Difference between ESG and CSR
Difference between ESG and Sustainability
Key takeaways from the definitions of ESG, CSR & Sustainability
Questions
Understanding the drivers of ESG in modern business
Regulatory increase - Paris Agreement
New risks arising
Finance & business opportunity 
Complex business landscape - parent company, overseas manufacturing
A deeper understanding into the categories and components of ESG (global and regulatory topics)
Differences around industries & the world', 1),

(@course_id, 'Frameworks & Regulations', 
'Global standards
Local standards
Industry-specific standards
Other terminologies', 2),

(@course_id, 'Business Objectives & materiality', 
'Identifying the components of ESG
Identifying the starting point of ESG in your business - materiality assessemnt
Identifying which aspect to address first
Assessing the implications and trade-offs of the starting points', 3),

(@course_id, 'Steps for measurement', 
'A questionnaire guide to Environmental
A questionnaire guide to Social
A questionnaire guide to Governance
ESG score & analysis
Greenhouse Gas calculations - scope 1, 2 and 3
Excel templates', 4),

(@course_id, 'Mitigation and using ESG to get ahead', 
'Analysing the result of the measurements
Analysing the competitor and regulatory implications
Identifying business opportunities
Measuring the cost and benefit of the business opportunity
Implementation - strategy level, tactical level & operational level
Taking advantage of CSR and other activities already doing 
Practical and real-world examples of ESG implementation.', 5);

-- Get chapter IDs
SET @chapter1_id = (SELECT id FROM chapters WHERE course_id = @course_id AND order_index = 1);
SET @chapter2_id = (SELECT id FROM chapters WHERE course_id = @course_id AND order_index = 2);
SET @chapter3_id = (SELECT id FROM chapters WHERE course_id = @course_id AND order_index = 3);
SET @chapter4_id = (SELECT id FROM chapters WHERE course_id = @course_id AND order_index = 4);
SET @chapter5_id = (SELECT id FROM chapters WHERE course_id = @course_id AND order_index = 5);

-- Insert videos for each chapter (placeholder URLs for now)
INSERT INTO videos (chapter_id, title, description, video_url, duration) VALUES
(@chapter1_id, 'Introduction to ESG', 'An overview of ESG principles and their importance', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1800),
(@chapter1_id, 'ESG vs CSR vs Sustainability', 'Understanding the differences between ESG, CSR, and Sustainability', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1500),
(@chapter1_id, 'ESG Drivers in Modern Business', 'Exploring the key drivers of ESG in today''s business landscape', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 2000),

(@chapter2_id, 'Global ESG Standards', 'Overview of global ESG standards and frameworks', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1800),
(@chapter2_id, 'Local and Industry Standards', 'Understanding local and industry-specific ESG standards', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1500),

(@chapter3_id, 'ESG Components', 'Identifying and understanding ESG components', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1800),
(@chapter3_id, 'Materiality Assessment', 'How to conduct a materiality assessment for ESG', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 2000),

(@chapter4_id, 'Environmental Measurement', 'Guide to measuring environmental impact', 'https://www.youtube-nocookie.com/embed/eJnQBXmZ7Ek?si=sjdR66r6yLLzj4mL', 1800),
(@chapter4_id, 'Social and Governance Measurement', 'Measuring social and governance aspects', 'https://example.com/video9', 1800),
(@chapter4_id, 'Greenhouse Gas Calculations', 'Understanding and calculating GHG emissions', 'https://example.com/video10', 2000),

(@chapter5_id, 'ESG Analysis and Strategy', 'Analyzing results and developing ESG strategies', 'https://example.com/video11', 1800),
(@chapter5_id, 'Implementation and Examples', 'Practical implementation of ESG strategies', 'https://example.com/video12', 2000); 