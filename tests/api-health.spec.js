// @ts-check
const { test, expect } = require('playwright/test');
const { BASE } = require('./fixtures');

test.describe('API Health & Endpoints', () => {

  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get(`${BASE}/api/health`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('GET /api/status returns service status', async ({ request }) => {
    const response = await request.get(`${BASE}/api/status`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/v3/workouts returns an array (anonymous mode)', async ({ request }) => {
    const response = await request.get(`${BASE}/api/v3/workouts`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(Array.isArray(data.workouts || data)).toBe(true);
  });

  test('POST /api/v3/workouts creates a workout', async ({ request }) => {
    const workout = {
      name: 'API Test Workout',
      description: 'Created by Playwright test',
      exercise_groups: [
        {
          group_id: 'api-test-group',
          exercises: { a: 'Test Exercise' },
          sets: '3',
          reps: '10',
          rest: '60s',
          group_type: 'standard',
        },
      ],
      tags: ['api-test'],
    };

    const response = await request.post(`${BASE}/api/v3/workouts`, { data: workout });
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.id || data.workout_id).toBeTruthy();
  });

  test('GET /api/v3/workouts/:id retrieves a specific workout', async ({ request }) => {
    // First create a workout
    const createResponse = await request.post(`${BASE}/api/v3/workouts`, {
      data: {
        name: 'Fetch Test Workout',
        exercise_groups: [],
        tags: [],
      },
    });
    const created = await createResponse.json();
    const id = created.id || created.workout_id;

    // Then fetch it
    const response = await request.get(`${BASE}/api/v3/workouts/${id}`);
    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.name).toBe('Fetch Test Workout');
  });

  test('DELETE /api/v3/workouts/:id archives a workout', async ({ request }) => {
    // Create
    const createResponse = await request.post(`${BASE}/api/v3/workouts`, {
      data: {
        name: 'Delete Test Workout',
        exercise_groups: [],
        tags: [],
      },
    });
    const created = await createResponse.json();
    const id = created.id || created.workout_id;

    // Delete (archive)
    const deleteResponse = await request.delete(`${BASE}/api/v3/workouts/${id}`);
    expect(deleteResponse.ok()).toBe(true);
  });

  test('PUT /api/v3/workouts/:id updates a workout', async ({ request }) => {
    // Create
    const createResponse = await request.post(`${BASE}/api/v3/workouts`, {
      data: {
        name: 'Update Test Workout',
        exercise_groups: [],
        tags: [],
      },
    });
    const created = await createResponse.json();
    const id = created.id || created.workout_id;

    // Update
    const updateResponse = await request.put(`${BASE}/api/v3/workouts/${id}`, {
      data: {
        name: 'Updated Workout Name',
        exercise_groups: [],
        tags: ['updated'],
      },
    });
    expect(updateResponse.ok()).toBe(true);

    // Verify
    const getResponse = await request.get(`${BASE}/api/v3/workouts/${id}`);
    const data = await getResponse.json();
    expect(data.name).toBe('Updated Workout Name');
  });
});
