// Sample assignment set used until real Classroom/Microsoft accounts are wired in.
// `dueInDays` is resolved to a real Date (relative to now) at load time, so the
// dashboard always looks current no matter when you open it.
const RAW_MOCK_ASSIGNMENTS = [
    { id: 'mock-1', title: 'Calculus Problem Set 4', subject: 'Math', grade: 'Freshman', dueInDays: 1, estHours: 2.5 },
    { id: 'mock-2', title: 'Lab Report: Chemical Equilibrium', subject: 'Science', grade: 'Sophomore', dueInDays: 2, estHours: 4 },
    { id: 'mock-3', title: 'French Revolution Essay Outline', subject: 'History', grade: 'Junior', dueInDays: 4, estHours: 1.5 },
    { id: 'mock-4', title: 'Poetry Analysis: Modernism', subject: 'Literature', grade: 'Senior', dueInDays: 5, estHours: 2 },
    { id: 'mock-5', title: 'Physics Worksheet: Kinematics', subject: 'Science', grade: 'Freshman', dueInDays: 6, estHours: 1.5 },
    { id: 'mock-6', title: 'Group Project Proposal', subject: 'History', grade: 'Freshman', dueInDays: 8, estHours: 2.5 },
    // A couple of already-finished items so the "Completed" tab has content.
    { id: 'mock-7', title: 'Reading Response: Chapter 3', subject: 'Literature', grade: 'Freshman', dueInDays: -2, estHours: 1, completed: true },
    { id: 'mock-8', title: 'Algebra Review Quiz', subject: 'Math', grade: 'Freshman', dueInDays: -5, estHours: 0.5, completed: true },
];

function loadMockAssignments() {
    const now = Date.now();
    const DAY = 86400000;
    return RAW_MOCK_ASSIGNMENTS.map(a => ({
        id: a.id,
        title: a.title,
        subject: a.subject,
        grade: a.grade,
        due: new Date(now + a.dueInDays * DAY),
        estHours: a.estHours,
        completed: !!a.completed,
        source: 'mock',
    }));
}
