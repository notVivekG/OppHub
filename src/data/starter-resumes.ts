import { JsonResume } from '@/types';

export const STARTER_RESUMES: Record<string, JsonResume> = {
  base: {
    basics: {
      name: 'Alex Rivera',
      label: 'Software Engineering Student',
      email: 'alex.rivera@example.com',
      phone: '+1 (555) 234-5678',
      url: 'https://github.com/alexrivera',
      summary: 'Computer Science student passionate about building performant full-stack systems and scalable web applications. Strong foundation in algorithms, systems design, and developer tooling.',
      location: {
        city: 'Seattle',
        region: 'WA',
        countryCode: 'US',
      },
      profiles: [
        { network: 'GitHub', username: 'alexrivera', url: 'https://github.com/alexrivera' },
        { network: 'LinkedIn', username: 'alex-rivera-cs', url: 'https://linkedin.com/in/alex-rivera-cs' },
      ],
    },
    work: [
      {
        name: 'TechFlow Systems',
        position: 'Software Engineer Intern',
        startDate: '2024-06',
        endDate: '2024-08',
        summary: 'Engineered backend microservices and developer productivity tools.',
        highlights: [
          'Engineered and launched high-throughput REST API endpoints in Go and PostgreSQL, reducing query latency by 35% for 45,000 daily users.',
          'Automated CI/CD pipelines using GitHub Actions and Docker, accelerating test execution by 40% across 12 services.',
          'Optimized distributed caching layer with Redis, reducing database load during peak traffic spikes by 25%.',
        ],
      },
      {
        name: 'University IT Labs',
        position: 'Student Developer & Peer Mentor',
        startDate: '2023-09',
        endDate: '2024-05',
        summary: 'Built campus web tools and mentored junior CS students in data structures.',
        highlights: [
          'Developed full-stack campus event reservation portal using Next.js, TypeScript, and Supabase, serving 4,200 active students.',
          'Mentored 60+ undergraduates weekly in algorithms, data structures, and object-oriented design principles.',
        ],
      },
    ],
    education: [
      {
        institution: 'University of Washington',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2022-09',
        endDate: '2026-06',
        score: '3.85 / 4.00',
        courses: ['Data Structures & Algorithms', 'Operating Systems', 'Database Systems', 'Distributed Systems'],
      },
    ],
    skills: [
      { name: 'Languages', level: 'Proficient', keywords: ['TypeScript', 'JavaScript', 'Python', 'Go', 'SQL', 'C++'] },
      { name: 'Frameworks & Tools', level: 'Proficient', keywords: ['React', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'Git', 'Tailwind CSS'] },
      { name: 'Cloud & Systems', level: 'Intermediate', keywords: ['AWS (S3, EC2)', 'Supabase', 'Redis', 'REST APIs', 'Linux'] },
    ],
    projects: [
      {
        name: 'DistriKV — Distributed Key-Value Store',
        description: 'Fault-tolerant distributed key-value store implementing Raft consensus.',
        highlights: [
          'Architected a distributed consensus protocol in Go achieving 99.9% uptime across simulated network partitions.',
          'Benchmarked read/write performance using gRPC, handling up to 12,000 requests per second under 5ms latency.',
        ],
        keywords: ['Go', 'Raft', 'gRPC', 'Distributed Systems'],
      },
      {
        name: 'DevRadar — Real-Time Opportunity Aggregator',
        description: 'Open-source web dashboard for monitoring developer internships and hackathons.',
        highlights: [
          'Built responsive dashboard with Next.js App Router and Tailwind CSS, achieving 98+ Google Lighthouse performance.',
          'Integrated real-time database webhooks delivering updates within 2 seconds of detection.',
        ],
        keywords: ['Next.js', 'TypeScript', 'Tailwind CSS', 'Supabase'],
      },
    ],
  },
  backend: {
    basics: {
      name: 'Alex Rivera',
      label: 'Backend & Systems Engineer',
      email: 'alex.rivera@example.com',
      phone: '+1 (555) 234-5678',
      url: 'https://github.com/alexrivera',
      summary: 'Systems-focused engineer specializing in scalable backend architectures, high-performance Go microservices, and relational database optimization.',
      location: {
        city: 'Seattle',
        region: 'WA',
        countryCode: 'US',
      },
      profiles: [
        { network: 'GitHub', username: 'alexrivera', url: 'https://github.com/alexrivera' },
        { network: 'LinkedIn', username: 'alex-rivera-cs', url: 'https://linkedin.com/in/alex-rivera-cs' },
      ],
    },
    work: [
      {
        name: 'TechFlow Systems',
        position: 'Backend Engineering Intern',
        startDate: '2024-06',
        endDate: '2024-08',
        summary: 'Focused on core data pipelines, database indexing, and microservice communication.',
        highlights: [
          'Architected and deployed concurrent Go services handling 15,000 requests per second with sub-10ms p99 latency.',
          'Optimized complex SQL joins and added partial indexing in PostgreSQL, slashing query execution time by 60%.',
          'Integrated Kafka message broker to decouple asynchronous billing notifications, processing 100,000+ daily events without data loss.',
        ],
      },
    ],
    education: [
      {
        institution: 'University of Washington',
        area: 'Computer Science (Systems Specialization)',
        studyType: 'Bachelor of Science',
        startDate: '2022-09',
        endDate: '2026-06',
        score: '3.85 / 4.00',
        courses: ['Operating Systems', 'Distributed Systems', 'Database Internals', 'Computer Networks'],
      },
    ],
    skills: [
      { name: 'Core Backend', level: 'Advanced', keywords: ['Go', 'Python', 'C++', 'PostgreSQL', 'Redis', 'Kafka'] },
      { name: 'Architecture', level: 'Proficient', keywords: ['Microservices', 'REST APIs', 'gRPC', 'Distributed Consensus', 'Concurrency'] },
      { name: 'DevOps & Cloud', level: 'Intermediate', keywords: ['Docker', 'Kubernetes', 'Linux', 'AWS', 'GitHub Actions'] },
    ],
    projects: [
      {
        name: 'DistriKV — Raft Key-Value Engine',
        description: 'Production-ready distributed key-value store with log replication and leader election.',
        highlights: [
          'Implemented Raft consensus in Go from scratch with zero external dependencies.',
          'Stress-tested cluster resilience with Jepsen-style fault injection tests under 30% packet drop.',
        ],
        keywords: ['Go', 'Distributed Systems', 'gRPC', 'Concurrency'],
      },
    ],
  },
  'ai-ml': {
    basics: {
      name: 'Alex Rivera',
      label: 'AI / Machine Learning Engineer',
      email: 'alex.rivera@example.com',
      phone: '+1 (555) 234-5678',
      url: 'https://github.com/alexrivera',
      summary: 'Undergraduate researcher and engineer specializing in deep learning, fine-tuning LLMs, computer vision, and high-throughput model inference pipelines.',
      location: {
        city: 'Seattle',
        region: 'WA',
        countryCode: 'US',
      },
      profiles: [
        { network: 'GitHub', username: 'alexrivera', url: 'https://github.com/alexrivera' },
        { network: 'LinkedIn', username: 'alex-rivera-cs', url: 'https://linkedin.com/in/alex-rivera-cs' },
      ],
    },
    work: [
      {
        name: 'UW Computational Vision Lab',
        position: 'Undergraduate ML Researcher',
        startDate: '2023-10',
        endDate: '2024-06',
        summary: 'Researched multimodal vision-language architectures and efficient model pruning.',
        highlights: [
          'Trained and evaluated PyTorch transformer models on 500,000 image-text pairs, boosting zero-shot retrieval accuracy by 8.4%.',
          'Quantized FP16 weights to 4-bit using bitsandbytes and TensorRT, reducing GPU VRAM consumption by 65% with &lt;1% accuracy drop.',
          'Co-authored workshop research paper submitted to CVPR on efficient attention mechanisms.',
        ],
      },
    ],
    education: [
      {
        institution: 'University of Washington',
        area: 'Computer Science (Machine Learning Track)',
        studyType: 'Bachelor of Science',
        startDate: '2022-09',
        endDate: '2026-06',
        score: '3.85 / 4.00',
        courses: ['Deep Learning', 'Natural Language Processing', 'Computer Vision', 'Probability & Statistics'],
      },
    ],
    skills: [
      { name: 'ML & Deep Learning', level: 'Advanced', keywords: ['PyTorch', 'TensorFlow', 'Hugging Face', 'Scikit-learn', 'NumPy', 'Pandas'] },
      { name: 'LLM & Generative AI', level: 'Proficient', keywords: ['LoRA Fine-tuning', 'RAG', 'LangChain', 'Vector DBs (Chroma, pgvector)', 'vLLM'] },
      { name: 'Engineering', level: 'Proficient', keywords: ['Python', 'FastAPI', 'Docker', 'CUDA', 'Git', 'Linux'] },
    ],
    projects: [
      {
        name: 'SemanticDocs — RAG Document Search Engine',
        description: 'Context-aware semantic question-answering system over technical PDF documentation.',
        highlights: [
          'Engineered hybrid BM25 + dense embedding retrieval pipeline with cross-encoder re-ranking.',
          'Achieved 140ms p50 query response time using FastAPI and streaming server-sent events.',
        ],
        keywords: ['Python', 'PyTorch', 'FastAPI', 'Vector Search', 'RAG'],
      },
    ],
  },
};
