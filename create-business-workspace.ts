import { db } from './server/db';
import { workspaces } from './shared/schema';
import { eq } from 'drizzle-orm';

async function createBusinessWorkspace() {
  console.log('Creating business workspace with subdomain...');
  
  try {
    // Create business workspace with subdomain
    const [businessWorkspace] = await db
      .insert(workspaces)
      .values({
        name: 'TechCorp Solutions',
        type: 'business',
        description: 'Enterprise workspace for TechCorp team collaboration',
        icon: '🏢',
        domain: 'techcorp', // This will be used for subdomain routing
        ownerId: 'admin-user-id', // Will be updated to actual admin ID
        plan: 'enterprise',
        settings: JSON.stringify({
          allowPublicPages: true,
          allowGuests: true,
          customDomain: 'techcorp.oururl.com'
        }),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .returning();
    
    console.log('✅ Business workspace created successfully!');
    console.log('Workspace:', businessWorkspace);
    console.log('Subdomain: techcorp.oururl.com');
    
    // Get admin user to update the owner
    const adminUser = await db.select().from(workspaces).where(eq(workspaces.name, 'Admin Workspace')).limit(1);
    if (adminUser.length > 0) {
      await db.update(workspaces)
        .set({ ownerId: adminUser[0].ownerId })
        .where(eq(workspaces.id, businessWorkspace.id));
      
      console.log('✅ Updated workspace owner to admin user');
    }
    
  } catch (error) {
    console.error('Error creating business workspace:', error);
  }
}

createBusinessWorkspace();