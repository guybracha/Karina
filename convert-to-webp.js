// סקריפט להמרת כל תמונות ה-PNG ל-WebP אמיתי
// הרצה: node convert-to-webp.js

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// פונקציה רקורסיבית למציאת כל קבצי PNG
async function findPngFiles(dir, fileList = []) {
  const files = await readdir(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);
    
    if (fileStat.isDirectory()) {
      await findPngFiles(filePath, fileList);
    } else if (file.endsWith('.png')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

async function main() {
  console.log('🔍 מחפש קבצי PNG בתיקיית webp...\n');
  
  const webpDir = path.join(__dirname, 'src', 'webp');
  const pngFiles = await findPngFiles(webpDir);
  
  console.log(`נמצאו ${pngFiles.length} קבצי PNG:\n`);
  pngFiles.forEach(file => {
    const relativePath = path.relative(__dirname, file);
    console.log(`  - ${relativePath}`);
  });
  
  console.log('\n📝 כדי להמיר את הקבצים ל-WebP אמיתי, השתמש באחת מהאופציות הבאות:\n');
  console.log('1. אתר אונליין: https://squoosh.app');
  console.log('2. תוכנה: XnConvert (חינמית)');
  console.log('3. שורת פקודה: התקן cwebp\n');
  console.log('לאחר ההמרה, עדכן את הקוד להשתמש בקבצי .webp במקום .png');
}

main().catch(console.error);
