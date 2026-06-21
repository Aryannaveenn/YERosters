import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

let lastCallTime = 0;
let dailyCalls = [];

function checkRateLimit() {
  const now = Date.now();

  if (now - lastCallTime < 2 * 60 * 1000) {
    const waitSecs = Math.ceil((2 * 60 * 1000 - (now - lastCallTime)) / 1000);
    throw new Error(`Rate limited — please wait ${waitSecs} seconds before generating again.`);
  }

  const dayStart = new Date().setHours(0, 0, 0, 0);
  dailyCalls = dailyCalls.filter(t => t >= dayStart);
  if (dailyCalls.length >= 20) {
    throw new Error('Daily limit reached — AI roster generation can only be used 20 times per day.');
  }

  lastCallTime = now;
  dailyCalls.push(now);
}

export async function generateRosterWithAI(availabilities, employees, schools, weekStarting, customPrompt, operatingHours) {
  checkRateLimit();
  const availabilityData = availabilities.map(a => ({
    employeeId: a.user._id.toString(),
    employeeName: a.user.name,
    days: a.days,
  }));

  const employeeList = employees.map(e => ({
    id: e._id.toString(),
    name: e.name,
    defaultSchoolId: e.defaultSchool?._id?.toString() || null,
    defaultSchoolName: e.defaultSchool?.name || null,
  }));

  const schoolSchedule = schools.map(s => ({
    schoolId: s._id.toString(),
    schoolName: s.name,
    days: s.days,
  }));

  const prompt = `You are a workforce scheduling assistant for an education company. Create a weekly roster (Monday-Friday).

Each school requires exactly 2 employees per day it operates. Assign employees to specific schools.

Employees: ${JSON.stringify(employeeList)}

Availability data: ${JSON.stringify(availabilityData)}

School schedule (which schools operate on which days): ${JSON.stringify(schoolSchedule)}

Operating hours: ${operatingHours.startTime} to ${operatingHours.endTime}

Rules:
- Each school needs exactly 2 employees on each day it operates
- All shifts must be within operating hours (${operatingHours.startTime} - ${operatingHours.endTime})
- Only schedule employees during their available hours
- Distribute shifts fairly across employees
- If an employee has no availability submitted, do not schedule them
- An employee can only be at one school per day
- If an employee has a defaultSchoolId, prioritise assigning them to that school when possible
${customPrompt ? `\nAdditional instructions from the admin:\n${customPrompt}` : ''}
Return ONLY a valid JSON array of shift objects with this exact format (no markdown, no explanation):
[{"userId": "...", "schoolId": "...", "day": "monday|tuesday|wednesday|thursday|friday", "startTime": "HH:MM", "endTime": "HH:MM"}]`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const parsed = JSON.parse(text);

  return parsed.map(shift => ({
    user: shift.userId,
    school: shift.schoolId,
    day: shift.day,
    startTime: shift.startTime,
    endTime: shift.endTime,
  }));
}
