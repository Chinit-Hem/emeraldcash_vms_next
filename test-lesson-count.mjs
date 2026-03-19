/**
 * Test script to verify lesson count fix
 * Run with: node test-lesson-count.mjs
 */

import { lmsService } from './src/services/LmsService.js';

async function testLessonCounts() {
  console.log('Testing lesson count fix...\n');
  
  try {
    const result = await lmsService.getCategories();
    
    if (!result.success) {
      console.error('❌ Failed to fetch categories:', result.error);
      return;
    }
    
    console.log('✅ Categories fetched successfully!\n');
    console.log('Category Lesson Counts:');
    console.log('======================\n');
    
    for (const category of result.data) {
      const lessonCount = category.lesson_count || 0;
      console.log(`${category.name}: ${lessonCount} lessons`);
      
      // Verify the count is a number
      if (typeof lessonCount !== 'number') {
        console.warn(`  ⚠️  Warning: lesson_count is not a number (${typeof lessonCount})`);
      }
      
      // Verify the count is not negative
      if (lessonCount < 0) {
        console.warn(`  ⚠️  Warning: lesson_count is negative (${lessonCount})`);
      }
    }
    
    console.log('\n======================');
    console.log('Test completed!');
    
    // Check if any categories have lessons
    const categoriesWithLessons = result.data.filter(c => c.lesson_count > 0);
    console.log(`\nCategories with lessons: ${categoriesWithLessons.length}/${result.data.length}`);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testLessonCounts();
