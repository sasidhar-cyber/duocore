require('dotenv').config();

const { Client } = require('pg');
const { QUESTIONS, ACHIEVEMENTS } = require('./seedData');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function seed() {
  try {
    await client.connect();

    console.log('[DB] Connected to PostgreSQL...');

    // Seed Questions
    const questionResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM questions'
    );

    if (questionResult.rows[0].count === 0) {
      console.log('[DB] Seeding questions...');

      for (const q of QUESTIONS) {
        await client.query(
          `
          INSERT INTO questions
          (
            id,
            subject_slug,
            topic_slug,
            difficulty,
            question_text,
            code_snippet,
            options,
            correct_index,
            explanation
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            q.id,
            q.subject_slug,
            q.topic_slug || 'general',
            q.difficulty || 'medium',
            q.question_text,
            q.code_snippet || '',
            JSON.stringify(q.options),
            q.correct_index,
            q.explanation
          ]
        );
      }

      console.log(`✅ ${QUESTIONS.length} questions inserted`);
    } else {
      console.log(
        `[DB] Questions already exist (${questionResult.rows[0].count})`
      );
    }

    // Seed Achievements
    const achievementResult = await client.query(
      'SELECT COUNT(*)::int AS count FROM achievements'
    );

    if (achievementResult.rows[0].count === 0) {
      console.log('[DB] Seeding achievements...');

      for (const a of ACHIEVEMENTS) {
        await client.query(
          `
          INSERT INTO achievements
          (
            id,
            slug,
            title,
            description,
            icon,
            category,
            xp_reward,
            max_progress
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id) DO NOTHING
          `,
          [
            a.id,
            a.slug,
            a.title,
            a.description,
            a.icon,
            a.category,
            a.xp_reward || 100,
            a.max_progress || 1
          ]
        );
      }

      console.log(`✅ ${ACHIEVEMENTS.length} achievements inserted`);
    } else {
      console.log(
        `[DB] Achievements already exist (${achievementResult.rows[0].count})`
      );
    }

    console.log('🎉 PostgreSQL seed completed successfully!');
  } catch (error) {
    console.error('❌ PostgreSQL seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

seed();
