// Based on supabase/seeds/dashboard.sql; grade variants are test-only edge cases.
module.exports = {
  studentName: 'Mohamed Akeel', indexNumber: 'OL2026001', maskedNic: '********5678',
  schoolName: 'Zahira College', examinationCenter: null,
  examinationName: 'PrepX O/L Model Exam', examinationYear: 2026, overallStatus: 'Passed',
  grades: ['A', 'B', 'C', 'S', 'W', 'AB', null, 'A'].map((grade, index) => ({
    subjectName: ['Tamil', 'English', 'Mathematics', 'Science', 'History', 'Religion', 'ICT', 'Commerce'][index],
    subjectCode: null, displayOrder: index, grade,
  })),
};
