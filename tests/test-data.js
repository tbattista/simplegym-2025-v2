/**
 * Shared mock data for Playwright tests.
 * Use with page.evaluate() to inject into localStorage.
 */

const STANDARD_WORKOUT = {
  id: 'test-workout-standard',
  name: 'Test Push Day',
  description: 'A test push workout',
  exercise_groups: [
    {
      group_id: 'group-std-1',
      exercises: { a: 'Barbell Bench Press' },
      sets: '3',
      reps: '8-12',
      rest: '90s',
      default_weight: '135',
      weight_unit: 'lbs',
      group_type: 'standard',
    },
    {
      group_id: 'group-std-2',
      exercises: { a: 'Dumbbell Shoulder Press' },
      sets: '3',
      reps: '10',
      rest: '60s',
      default_weight: '40',
      weight_unit: 'lbs',
      group_type: 'standard',
    },
  ],
  sections: [
    {
      section_id: 'sec-1',
      type: 'standard',
      name: '',
      exercises: [
        { exercise_id: 'ex-1', name: 'Barbell Bench Press', sets: '3', reps: '8-12', rest: '90s', default_weight: '135', weight_unit: 'lbs' },
      ],
    },
    {
      section_id: 'sec-2',
      type: 'standard',
      name: '',
      exercises: [
        { exercise_id: 'ex-2', name: 'Dumbbell Shoulder Press', sets: '3', reps: '10', rest: '60s', default_weight: '40', weight_unit: 'lbs' },
      ],
    },
  ],
  tags: ['push', 'test'],
  created_date: '2026-03-01T10:00:00Z',
  modified_date: '2026-03-01T10:00:00Z',
  is_archived: false,
};

const CARDIO_WORKOUT = {
  id: 'test-workout-cardio',
  name: 'Test Cardio Session',
  description: 'A test cardio workout',
  exercise_groups: [
    {
      group_id: 'group-cardio-1',
      exercises: { a: 'Running' },
      sets: '',
      reps: '',
      rest: '',
      group_type: 'cardio',
      cardio_config: { activity_type: 'running', duration_minutes: 30 },
    },
  ],
  sections: [
    {
      section_id: 'sec-c1',
      type: 'cardio',
      name: '',
      exercises: [
        { exercise_id: 'ex-c1', name: 'Running', sets: '', reps: '', rest: '', cardio_config: { activity_type: 'running', duration_minutes: 30 } },
      ],
    },
  ],
  tags: ['cardio', 'test'],
  created_date: '2026-03-01T10:00:00Z',
  modified_date: '2026-03-01T10:00:00Z',
  is_archived: false,
};

const SUPERSET_WORKOUT = {
  id: 'test-workout-superset',
  name: 'Test Superset Day',
  description: 'A test superset workout',
  exercise_groups: [
    {
      group_id: 'group-ss-1',
      exercises: { a: 'Barbell Curl', b: 'Tricep Pushdown' },
      sets: '3',
      reps: '12',
      rest: '60s',
      group_type: 'standard',
      block_id: 'block-1',
      group_name: 'Arms Superset',
    },
  ],
  sections: [
    {
      section_id: 'sec-ss1',
      type: 'superset',
      name: 'Arms Superset',
      exercises: [
        { exercise_id: 'ex-ss1', name: 'Barbell Curl', sets: '3', reps: '12', rest: '60s' },
        { exercise_id: 'ex-ss2', name: 'Tricep Pushdown', sets: '3', reps: '12', rest: '60s' },
      ],
    },
  ],
  tags: ['arms', 'test'],
  created_date: '2026-03-01T10:00:00Z',
  modified_date: '2026-03-01T10:00:00Z',
  is_archived: false,
};

const COMPLETED_SESSION = {
  sessionId: 'session-test-001',
  workoutId: 'test-workout-standard',
  workoutName: 'Test Push Day',
  startedAt: '2026-03-06T10:00:00Z',
  completedAt: '2026-03-06T11:00:00Z',
  status: 'completed',
  sessionMode: 'timed',
  exercises: {
    'ex-1': {
      name: 'Barbell Bench Press',
      sets: [
        { weight: '135', reps: '10', completed: true },
        { weight: '135', reps: '8', completed: true },
        { weight: '135', reps: '8', completed: true },
      ],
    },
    'ex-2': {
      name: 'Dumbbell Shoulder Press',
      sets: [
        { weight: '40', reps: '10', completed: true },
        { weight: '40', reps: '10', completed: true },
        { weight: '40', reps: '10', completed: true },
      ],
    },
  },
  sessionNotes: [],
  exerciseOrder: ['ex-1', 'ex-2'],
  lastUpdated: '2026-03-06T11:00:00Z',
  version: '2.4',
  schemaVersion: 2,
};

const ALL_WORKOUTS = [STANDARD_WORKOUT, CARDIO_WORKOUT, SUPERSET_WORKOUT];

module.exports = {
  STANDARD_WORKOUT,
  CARDIO_WORKOUT,
  SUPERSET_WORKOUT,
  COMPLETED_SESSION,
  ALL_WORKOUTS,
};
