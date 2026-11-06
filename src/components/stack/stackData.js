// The three stations of the Mission Control stack section. Only the technologies listed in the brief for this section.
// item = [name, Simple Icons export name | null, monogram]. A null icon shows the monogram badge instead: these have no
// logo in simple-icons@11.14.0 (Matplotlib, Seaborn, Django REST Framework, ...) or are concepts rather than products.
export const STATIONS = [
  {
    id: 'software', tab: 'Software', title: 'Software & Backend Systems', short: 'Software & Backend',
    desc: 'The languages, web foundations and backend tools I use to build APIs and data-backed applications.',
    groups: [
      { name: 'Programming and Web', items: [['Python', 'siPython', 'Py'], ['JavaScript', 'siJavascript', 'JS'], ['HTML5', 'siHtml5', 'H5'], ['CSS3', 'siCss3', 'C3']] },
      { name: 'Backend and Databases', items: [['Django', 'siDjango', 'Dj'], ['Django REST Framework', null, 'DRF'], ['SQL', null, 'SQL'], ['PostgreSQL', 'siPostgresql', 'Pg'], ['SQLite', 'siSqlite', 'SQ'], ['REST APIs', null, 'API'], ['Streamlit', 'siStreamlit', 'St']] },
    ],
  },
  {
    id: 'ai', tab: 'AI / ML', title: 'AI, ML & Data Science', short: 'AI, ML & Data Science',
    desc: 'The tools I use for data analysis, machine learning, computer vision, NLP and intelligent systems.',
    groups: [
      { name: 'Data Science and Analysis', items: [['Pandas', 'siPandas', 'Pd'], ['NumPy', 'siNumpy', 'Np'], ['Matplotlib', null, 'Mpl'], ['Seaborn', null, 'Sns'], ['Power BI', 'siPowerbi', 'BI']] },
      { name: 'Machine Learning and Computer Vision', items: [['Scikit-learn', 'siScikitlearn', 'Sk'], ['TensorFlow', 'siTensorflow', 'TF'], ['OpenCV', 'siOpencv', 'CV']] },
      { name: 'NLP and Intelligent Systems', items: [['Sentence Transformers', null, 'ST'], ['FAISS', null, 'FAISS'], ['TF-IDF', null, 'TF·IDF'], ['NLTK', null, 'NLTK'], ['LLMs', null, 'LLM'], ['AI Agents', null, 'AGT'], ['Google Gemini API', 'siGooglegemini', 'Gem']] },
    ],
  },
  {
    id: 'tools', tab: 'Tools', title: 'Developer Tools & Infrastructure', short: 'Tools & Infrastructure',
    desc: 'The tools and platforms I use for version control, API testing and deployment.',
    groups: [
      { name: 'Tools and Platforms', items: [['Git', 'siGit', 'Git'], ['GitHub', 'siGithub', 'GH'], ['Postman', 'siPostman', 'Pm'], ['Vercel', 'siVercel', 'Vc']] },
    ],
  },
];
