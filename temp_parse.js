const fs = require('fs');
const data = JSON.parse(fs.readFileSync('C:\\Users\\Admin\\Downloads\\hsc_matrix_determinant_questions_page3.json', 'utf8'));

for (let i = 0; i < data.length; i++) {
  const item = data[i];
  if (item.explanation) {
    const parts = item.explanation.split('---');
    if (parts.length > 3) {
      console.log(`Index ${i}, Board: ${item.board}, Year: ${item.year}, Parts: ${parts.length}`);
    }
  }
}
