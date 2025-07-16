import { db } from './server/db';
import { users, workspaces, workspaceMembers } from './shared/schema';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';

async function createAdmin() {
  console.log('Creating admin user...');
  
  const adminId = nanoid();
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  try {
    // Create admin user
    const [adminUser] = await db
      .insert(users)
      .values({
        id: adminId,
        email: 'admin@mindtracker.com',
        username: 'admin',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        theme: 'system',
        timezone: 'UTC',
        language: 'en',
        notifications: '{"email":true,"desktop":true,"mentions":true,"comments":true}',
        privacy: '{"profileVisible":true,"activityVisible":true}',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();
    
    console.log('Admin user created:', adminUser);
    
    // Create default workspace for admin
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: 'Admin Workspace',
        type: 'business',
        description: 'Default admin workspace',
        icon: '🏢',
        ownerId: adminId,
        plan: 'enterprise',
        settings: '{}',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();
    
    console.log('Admin workspace created:', workspace);
    
    // Add admin as workspace member
    await db
      .insert(workspaceMembers)
      .values({
        workspaceId: workspace.id,
        userId: adminId,
        role: 'owner',
        permissions: '{}',
        joinedAt: Date.now(),
      });
    
    console.log('✅ Admin credentials created successfully!');
    console.log('Email: admin@mindtracker.com');
    console.log('Password: admin123');
    
  } catch (error) {
    console.error('Error creating admin:', error);
  }
}

createAdmin();