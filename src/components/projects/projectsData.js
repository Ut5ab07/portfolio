// Add real URLs in href (GitHub) / demo (live) — links render only when set.
// Empty fields (null / []) are simply left out of the details dialog.
export const PROJECTS = [
  {
    "title": "Football Scouting Engine",
    "motif": "scout",
    "ar": "16/10",
    "cls": "p1",
    "d": 14,
    "desc": "Data analysis and machine learning for football scouting, built around player similarity and recommendations.",
    "tags": [
      "Data analysis",
      "Machine learning",
      "Player similarity",
      "Recommendations"
    ],
    "href": "https://github.com/Ut5ab07/Football-Scouting-Engine",
    "demo": null,
    "problem": null,
    "purpose": "Support football scouting with data analysis and machine learning, focused on player similarity and recommendations.",
    "features": [
      "Player similarity",
      "Recommendations",
      "Data analysis and machine learning"
    ],
    "workflow": [
      "Data analysis",
      "Machine learning",
      "Player similarity",
      "Recommendations"
    ],
    "tech": [
      "Python",
      "Pandas",
      "NumPy",
      "Scikit-learn",
      "Matplotlib"
    ],
    "role": null
  },
  {
    "title": "AI Data Analyst Agent",
    "motif": "agent",
    "ar": "4/5",
    "cls": "p2",
    "d": 22,
    "desc": "Automated exploratory data analysis, visualizations, predictive modelling, and LLM integration.",
    "tags": [
      "Exploratory data analysis",
      "Visualizations",
      "Predictive modelling",
      "LLM integration"
    ],
    "href": "https://github.com/Ut5ab07/data-analyst-agent",
    "demo": null,
    "problem": null,
    "purpose": "Automate the exploratory analysis of a dataset and extend it with predictive modelling and an LLM.",
    "features": [
      "Automated exploratory data analysis",
      "Visualizations",
      "Predictive modelling",
      "LLM integration"
    ],
    "workflow": [
      "Exploratory data analysis",
      "Visualizations",
      "Predictive modelling",
      "LLM integration"
    ],
    "tech": [
      "Python",
      "Pandas",
      "Streamlit",
      "Matplotlib",
      "Google Gemini API"
    ],
    "role": null
  },
  {
    "title": "Semantic Movie Search",
    "motif": "semantic",
    "ar": "16/9",
    "cls": "p3",
    "d": 10,
    "desc": "Semantic search and recommendation systems for movies, using NLP and embeddings.",
    "tags": [
      "Semantic search",
      "NLP",
      "Embeddings",
      "Recommendation systems"
    ],
    "href": "https://github.com/Ut5ab07/semantic-movie-search-engine",
    "demo": null,
    "problem": null,
    "purpose": "Search and recommend movies by meaning, using NLP and embeddings.",
    "features": [
      "Semantic search",
      "Recommendation systems",
      "NLP and embeddings"
    ],
    "workflow": [
      "NLP",
      "Embeddings",
      "Semantic search",
      "Recommendations"
    ],
    "tech": [
      "Python",
      "Sentence Transformers",
      "FAISS",
      "Pandas"
    ],
    "role": null
  },
  {
    "title": "Graph-Based Movie Recommendation",
    "motif": "graph",
    "ar": "16/10",
    "cls": "p4",
    "d": 18,
    "desc": "Recommends movies by modelling users and movies as a graph and finding like-minded viewers through shared ratings.",
    "tags": [
      "Graph theory",
      "Recommendation systems",
      "NetworkX",
      "Flask"
    ],
    "href": "https://github.com/Ut5ab07/Movie_recommendation",
    "demo": null,
    "problem": null,
    "purpose": "Models relationships between users and movies as a bipartite graph, where edges are positively rated movies. Analysing graph connectivity and shared preferences identifies similar users and recommends the movies they enjoyed.",
    "features": [
      "Bipartite graph representation of users and movies",
      "Edge creation based on positively rated movies",
      "Graph traversal to identify similar users",
      "Recommendation generation through shared movie connections",
      "Exploration of hidden relationships between user preferences"
    ],
    "workflow": [
      "Build the user–movie graph",
      "Find similar users",
      "Recommend through shared connections"
    ],
    "tech": [
      "Python",
      "NetworkX",
      "Pandas",
      "Flask",
      "HTML",
      "CSS",
      "JavaScript"
    ],
    "role": null
  },
  {
    "title": "AI Learning Platform API",
    "motif": "api",
    "ar": "4/3",
    "cls": "p5",
    "d": 12,
    "desc": "A Django REST Framework backend for an AI learning platform: authentication, course enrollment, lesson progress and reviews.",
    "tags": [
      "Django REST Framework",
      "JWT",
      "REST APIs",
      "Permissions"
    ],
    "href": "https://github.com/Ut5ab07/learning-platform-api",
    "demo": null,
    "problem": null,
    "purpose": "A scalable backend for an AI learning platform inspired by modern e-learning systems, following production-ready practices such as JWT authentication, object-level permissions, filtering, pagination and modular application design.",
    "features": [
      "Secure user authentication with JWT",
      "Browse and search AI courses",
      "Course enrollment, progress tracking, ratings and reviews",
      "Filtering, searching, and pagination",
      "Role-based and object-level permissions",
      "RESTful API with modular Django app structure",
      "Responsive interface built with HTML, CSS, and JavaScript"
    ],
    "workflow": [
      "Authenticate",
      "Discover courses",
      "Enroll",
      "Track progress",
      "Review"
    ],
    "tech": [
      "Python",
      "Django REST Framework",
      "HTML",
      "CSS",
      "JavaScript",
      "JWT Authentication"
    ],
    "role": null
  }
];
