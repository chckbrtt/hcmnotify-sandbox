import { faker } from '@faker-js/faker';
import { v4 as uuid } from 'uuid';
import { getDb } from './schema';

const DEPARTMENTS = [
  'Human Resources', 'Engineering', 'Sales', 'Marketing',
  'Finance', 'Operations', 'Customer Support', 'Legal'
];

const JOB_TITLES = [
  'Software Engineer', 'Senior Developer', 'Product Manager', 'Sales Representative',
  'HR Coordinator', 'Financial Analyst', 'Operations Manager', 'Marketing Specialist',
  'Customer Support Agent', 'Legal Counsel', 'Data Analyst', 'DevOps Engineer',
  'Account Executive', 'Recruiter', 'Office Manager'
];

const LOCATIONS = [
  { name: 'Headquarters', city: 'Denver', state: 'CO', zip: '80202' },
  { name: 'East Office', city: 'New York', state: 'NY', zip: '10001' },
  { name: 'West Office', city: 'San Francisco', state: 'CA', zip: '94105' }
];

const BENEFIT_PLANS = [
  { name: 'Medical - PPO Gold', coverage_levels: ['Employee Only', 'Employee + Spouse', 'Employee + Family'], deduction_range: [150, 450], employer: [400, 800] },
  { name: 'Medical - HDHP', coverage_levels: ['Employee Only', 'Employee + Spouse', 'Employee + Family'], deduction_range: [75, 250], employer: [300, 600] },
  { name: 'Dental - Basic', coverage_levels: ['Employee Only', 'Employee + Family'], deduction_range: [20, 60], employer: [30, 50] },
  { name: 'Vision', coverage_levels: ['Employee Only', 'Employee + Family'], deduction_range: [10, 25], employer: [15, 25] },
  { name: '401(k)', coverage_levels: ['Employee Only'], deduction_range: [100, 800], employer: [50, 400] },
];

export function seedTenant(tenantId: string) {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM employees WHERE tenant_id = ?').get(tenantId) as any;
  if (existing.cnt > 0) return;

  // Seed locations
  const locationIds: string[] = [];
  const insertLocation = db.prepare('INSERT INTO locations (id, tenant_id, name, address, city, state, zip) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const loc of LOCATIONS) {
    const id = uuid();
    locationIds.push(id);
    insertLocation.run(id, tenantId, loc.name, faker.location.streetAddress(), loc.city, loc.state, loc.zip);
  }

  // Seed departments
  const deptIds: string[] = [];
  const insertDept = db.prepare('INSERT INTO departments (id, tenant_id, name, code) VALUES (?, ?, ?, ?)');
  for (const dept of DEPARTMENTS) {
    const id = uuid();
    deptIds.push(id);
    insertDept.run(id, tenantId, dept, dept.substring(0, 3).toUpperCase() + faker.number.int({ min: 100, max: 999 }));
  }

  // Seed job titles
  const jobIds: string[] = [];
  const insertJob = db.prepare('INSERT INTO job_titles (id, tenant_id, name, code) VALUES (?, ?, ?, ?)');
  for (const job of JOB_TITLES) {
    const id = uuid();
    jobIds.push(id);
    insertJob.run(id, tenantId, job, 'JT' + faker.number.int({ min: 1000, max: 9999 }));
  }

  // Seed 100 employees
  const employeeIds: string[] = [];
  const insertEmployee = db.prepare(`
    INSERT INTO employees (id, tenant_id, employee_number, first_name, last_name, email, ssn_masked, status, hire_date, termination_date, job_title, department, location, pay_rate, pay_frequency, manager_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTime = db.prepare(`
    INSERT INTO time_entries (id, tenant_id, employee_id, date, punch_in, punch_out, hours, department)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBenefit = db.prepare(`
    INSERT INTO benefits (id, tenant_id, employee_id, plan_name, coverage_level, employee_deduction, employer_contribution, effective_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    for (let i = 0; i < 100; i++) {
      const empId = uuid();
      employeeIds.push(empId);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const location = faker.helpers.arrayElement(LOCATIONS).name;
      const department = faker.helpers.arrayElement(DEPARTMENTS);
      const jobTitle = faker.helpers.arrayElement(JOB_TITLES);
      const hireDate = faker.date.past({ years: 5 }).toISOString().split('T')[0];

      let status = 'Active';
      let terminationDate: string | null = null;
      let payRate = parseFloat(faker.number.float({ min: 15, max: 85, fractionDigits: 2 }).toFixed(2));
      let ssnMasked: string | null = `***-**-${faker.number.int({ min: 1000, max: 9999 })}`;

      // Special "problem" records
      if (i === 42) { ssnMasked = null; } // missing SSN
      if (i === 43) { // duplicate name - use same name as #42
        // We'll just set a known duplicate
      }
      if (i === 77) { status = 'Terminated'; terminationDate = faker.date.recent({ days: 90 }).toISOString().split('T')[0]; }
      if (i === 78) { status = 'Terminated'; terminationDate = faker.date.recent({ days: 60 }).toISOString().split('T')[0]; }
      if (i === 79) { status = 'Leave of Absence'; }
      if (i === 80) { status = 'Leave of Absence'; }
      if (i === 81) { status = 'Terminated'; terminationDate = faker.date.recent({ days: 30 }).toISOString().split('T')[0]; }
      if (i === 99) { payRate = 0.00; } // $0 pay rate problem record

      // Problem: terminated but active benefits (employee 77)
      const empNumber = `EMP${String(i + 1).padStart(4, '0')}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sandbox.example.com`;
      const payFreq = faker.helpers.arrayElement(['Bi-Weekly', 'Semi-Monthly', 'Weekly']);

      insertEmployee.run(
        empId, tenantId, empNumber, firstName, lastName, email, ssnMasked,
        status, hireDate, terminationDate, jobTitle, department, location,
        payRate, payFreq, i > 0 ? employeeIds[0] : null
      );

      // Time entries for active employees (last 30 days)
      if (status === 'Active') {
        for (let d = 0; d < 30; d++) {
          const date = new Date();
          date.setDate(date.getDate() - d);
          if (date.getDay() === 0 || date.getDay() === 6) continue; // skip weekends

          const punchInHour = faker.number.int({ min: 7, max: 9 });
          const punchInMin = faker.number.int({ min: 0, max: 59 });
          const hoursWorked = parseFloat(faker.number.float({ min: 7, max: 9.5, fractionDigits: 2 }).toFixed(2));
          const punchOutHour = punchInHour + Math.floor(hoursWorked);
          const punchOutMin = Math.round((hoursWorked % 1) * 60);

          const dateStr = date.toISOString().split('T')[0];
          const punchIn = `${String(punchInHour).padStart(2, '0')}:${String(punchInMin).padStart(2, '0')}`;
          const punchOut = `${String(punchOutHour).padStart(2, '0')}:${String(Math.min(punchOutMin, 59)).padStart(2, '0')}`;

          insertTime.run(uuid(), tenantId, empId, dateStr, punchIn, punchOut, hoursWorked, department);
        }
      }

      // Benefits for ~60% of employees
      if (i % 5 !== 0 || i === 77) { // 77 is terminated-with-active-benefits problem record
        const numPlans = faker.number.int({ min: 1, max: 3 });
        const selectedPlans = faker.helpers.arrayElements(BENEFIT_PLANS, numPlans);
        for (const plan of selectedPlans) {
          const coverage = faker.helpers.arrayElement(plan.coverage_levels);
          const deduction = parseFloat(faker.number.float({ min: plan.deduction_range[0], max: plan.deduction_range[1], fractionDigits: 2 }).toFixed(2));
          const employer = parseFloat(faker.number.float({ min: plan.employer[0], max: plan.employer[1], fractionDigits: 2 }).toFixed(2));
          const effDate = faker.date.past({ years: 2 }).toISOString().split('T')[0];
          const benefitStatus = (i === 77) ? 'Active' : (status === 'Terminated' ? 'Terminated' : 'Active');
          insertBenefit.run(uuid(), tenantId, empId, plan.name, coverage, deduction, employer, effDate, benefitStatus);
        }
      }
    }

    // Make employee 43 a duplicate name of employee 42
    const emp42 = db.prepare('SELECT first_name, last_name FROM employees WHERE tenant_id = ? AND employee_number = ?').get(tenantId, 'EMP0043') as any;
    if (emp42) {
      db.prepare('UPDATE employees SET first_name = ?, last_name = ? WHERE tenant_id = ? AND employee_number = ?')
        .run(emp42.first_name, emp42.last_name, tenantId, 'EMP0044');
    }
  });

  seedAll();
}
