// Synthetic fixture based on supabase/seeds/dashboard.sql.
module.exports = {
  studentName: 'Fictional Student 001', indexNumber: 'OL2026001', maskedNic: '********0001',
  schoolName: 'Example Academy Alpha', examinationCenter: null,
  examinationName: 'PrepX O/L Model Exam', examinationYear: 2026, overallStatus: 'Passed',
  grades: ['A', 'B', 'C', 'S', 'W', 'AB', null, 'A'].map((grade, index) => ({
    subjectName: ['Tamil', 'English', 'Mathematics', 'Science', 'History', 'Religion', 'ICT', 'Commerce'][index],
    subjectCode: null, displayOrder: index, grade,
  })),
};
