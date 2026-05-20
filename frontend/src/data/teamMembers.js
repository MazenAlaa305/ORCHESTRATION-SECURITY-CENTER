// Seed data for the About Us page. Sourced from the team's intake sheet.
// Admin edits made through the page UI overlay this list via localStorage.

// Google Drive "open?id=…" links can't be used as <img src>. Convert to the
// thumbnail endpoint, which serves the file as an image with a size hint.
export const driveImage = (idOrUrl, size = 480) => {
    if (!idOrUrl) return '';
    const match = String(idOrUrl).match(/[-\w]{25,}/);
    const id = match ? match[0] : idOrUrl;
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${size}`;
};

export const DEFAULT_ABOUT_COPY = {
    eyebrow: 'About OSC',
    heading: 'The team behind Orchestration Security Center',
    intro:
        'We are a graduation team of eleven engineers building a deterministic, ' +
        'AI-assisted security platform for small and mid-sized businesses — turning ' +
        'noisy scanner output into a handful of prioritized actions.',
};

export const DEFAULT_TEAM = [
    {
        id: 'omar-kapil',
        name: 'Omar Kapil',
        role: 'Project Team Leader & Developer',
        bio: 'Leads the team and owns end-to-end delivery across the stack.',
        email: 'omarkapil012@gmail.com',
        linkedin: 'https://www.linkedin.com/in/omarkapil',
        photo: driveImage('1f76BOULr_HSzhrUcitL8r1epXccMQfU5'),
    },
    {
        id: 'youssef-abdelhady',
        name: 'Youssef Abdelhady',
        role: 'AI Security & Intelligence Engineer',
        bio: 'Designs the AI advisor and threat-intelligence enrichment pipeline.',
        email: 'youssef3bhady04@gmail.com',
        linkedin: 'https://www.linkedin.com/in/youssef-abd-elhady-627a73307',
        photo: driveImage('1jnz3fvgpYXvQC3Q7gKYa4IVg45NRzDW7'),
    },
    {
        id: 'omnia-helmy',
        name: 'Omnia Helmy',
        role: 'Data Visualization & Network Topology Specialist',
        bio: 'Builds the network graphs and dashboards that make scan data legible.',
        email: 'helmyomnia63@gmail.com',
        linkedin: 'https://www.linkedin.com/in/omnia-helmy-089a412b3',
        photo: driveImage('1Zh2GHeCKtW1D1FAdHZve0vGJFfR2aKPf'),
    },
    {
        id: 'mohamed-shaban',
        name: 'Mohamed Shaban',
        role: 'Orchestration & Automation Engineer',
        bio: 'Chains Nmap, Nuclei and OpenVAS into the deterministic scan pipeline.',
        email: 'mohamed.r.shaban@icloud.com',
        linkedin: 'https://www.linkedin.com/in/mohamed-shaban-a460b4223',
        photo: driveImage('1n3d1_OT3v_aCwuCL2N2cQBiqYt7BuQzX'),
    },
    {
        id: 'omar-elshafey',
        name: 'Omar Elshafey',
        role: 'Cyber Risk Architect & Report Engineer',
        bio: 'Owns risk scoring and the executive reporting that goes to stakeholders.',
        email: 'omartarekelshafey7@gmail.com',
        linkedin: 'https://www.linkedin.com/in/omar-elshafey/',
        photo: driveImage('1OwfTc3p29-jSs-gMRQN7cC6IyhT1AP9S'),
    },
    {
        id: 'rahma-ibrahim',
        name: 'Rahma Ibrahim',
        role: 'Frontend Architecture',
        bio: 'Shapes the React frontend architecture and component system.',
        email: 'rahmaibrahimahmed2003@gmail.com',
        linkedin: '',
        photo: driveImage('1GeIDE0jYTO17oIX6KZuxDMIA6KaquN6I'),
    },
    {
        id: 'mariz-ehab',
        name: 'Mariz Ehab',
        role: 'SIEM & Threat Monitoring Specialist',
        bio: 'Builds the SIEM integration and real-time threat monitoring layer.',
        email: 'marizehab12@gmail.com',
        linkedin: 'https://www.linkedin.com/in/mariz-ehab-a7a32026a',
        photo: driveImage('1trgp2YXUfbuSk1Vz537rE-KtzpF5NwpG'),
    },
    {
        id: 'reem-ameen',
        name: 'Reem Ameen Mahmoud',
        role: 'Backend Architecture',
        bio: 'Designs the FastAPI backend, data model and service contracts.',
        email: 'reemameen928@gmail.com',
        linkedin: 'https://www.linkedin.com/in/reem-ameen-mahmoud-a24775275',
        photo: driveImage('1qOWhYIXuxXZjx2-eYs61u5dVdTmoC_ze'),
    },
    {
        id: 'youssef-ali',
        name: 'Youssef Ali',
        role: 'QA & API Integration Engineer',
        bio: 'Owns API integration tests and end-to-end quality assurance.',
        email: 'youssefali5120@gmail.com',
        linkedin: 'https://www.linkedin.com/in/youssefalimaher/',
        photo: driveImage('1r669IZgG4D42KHmdIB1osSbOLmY0wkm0'),
    },
    {
        id: 'mazen-alaa',
        name: 'Mazen Alaa',
        role: 'E2E Testing Engineer',
        bio: 'Writes the end-to-end test suite that gates every release.',
        email: 'mazenalaa188@gmail.com',
        linkedin: 'https://www.linkedin.com/in/mazen-alaael-din-ba5407235/',
        photo: driveImage('1LB8z06oynwoz4OGWDQUY_iXpiCbK83eP'),
    },
    {
        id: 'shahd-baher',
        name: 'Shahd Baher Hussien',
        role: 'Security Scanning & Vulnerability Assessment Engineer',
        bio: 'Drives the OpenVAS scanning workflow and vulnerability triage.',
        email: 'shahdhussien400@gmail.com',
        linkedin: 'https://www.linkedin.com/in/shahd-al-fadali-820154276/',
        photo: driveImage('1y-jv6vYr2RVGd4RPUHbIC7d8f7DLrW61'),
    },
];
