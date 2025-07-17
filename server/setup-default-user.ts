import { db } from "./db";
import { users, movies } from "@shared/schema";
import { authService } from "./auth";
import { eq, isNull } from "drizzle-orm";

export async function setupDefaultUser() {
  try {
    console.log("Setting up default user for existing movies...");
    
    // Check if there are any movies without a userId
    const orphanedMovies = await db.select().from(movies).where(isNull(movies.userId));
    
    if (orphanedMovies.length === 0) {
      console.log("No orphaned movies found. Setup complete.");
      return;
    }
    
    console.log(`Found ${orphanedMovies.length} movies without user assignment.`);
    
    // Check if a default user already exists
    let defaultUser = await authService.getUserByUsername("admin");
    
    if (!defaultUser) {
      console.log("Creating default admin user...");
      // Create a default admin user
      defaultUser = await authService.createUser({
        username: "admin",
        email: "admin@yourflix.local",
        displayName: "Admin User",
        passwordHash: "defaultpassword123", // Will be hashed by authService
      });
      
      console.log(`Created default user: ${defaultUser.username} (ID: ${defaultUser.id})`);
    } else {
      console.log(`Using existing default user: ${defaultUser.username} (ID: ${defaultUser.id})`);
    }
    
    // Assign all orphaned movies to the default user
    const updateResult = await db
      .update(movies)
      .set({ userId: defaultUser.id })
      .where(isNull(movies.userId));
    
    console.log(`Updated ${orphanedMovies.length} movies to belong to default user.`);
    console.log("Setup complete! Default credentials:");
    console.log("Username: admin");
    console.log("Password: defaultpassword123");
    console.log("Please change these credentials after first login.");
    
  } catch (error) {
    console.error("Error setting up default user:", error);
    throw error;
  }
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupDefaultUser().then(() => {
    console.log("Default user setup completed successfully.");
    process.exit(0);
  }).catch((error) => {
    console.error("Failed to setup default user:", error);
    process.exit(1);
  });
}