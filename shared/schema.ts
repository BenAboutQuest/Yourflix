import { pgTable, text, serial, integer, real, timestamp, varchar, index, boolean, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sessions table for authentication
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("sessions_user_id_idx").on(table.userId),
]);

export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Core metadata fields (scraped from LDDB or fallback AI)
  title: text("title").notNull(),
  country: text("country"), // Scraped from LDDB
  year: integer("year"), // Scraped from LDDB
  description: text("description"), // Scraped from general movie database
  runtime: integer("runtime"), // Scraped from general movie database (in minutes)
  pictureFormat: text("picture_format"), // Scraped from LDDB (Pan & Scan, Widescreen)
  catalogueNumber: text("catalogue_number"), // User input (e.g., PILF-1618, LV1234)
  director: text("director"), // Scraped from general movie database
  actors: text("actors").array().$type<string[]>().default([]), // Scraped from general movie database
  genres: text("new_genres").array().$type<string[]>().default([]), // Scraped from movie database (required for frontend)
  subGenres: text("sub_genres").array().$type<string[]>().default([]), // Sub-genre classifications
  format: text("format").notNull().default("DVD"), // Media format: LaserDisc, DVD, Blu-ray, VHS, etc.
  
  // User input fields
  estimatedValue: real("estimated_value"), // User manual estimate
  condition: integer("condition"), // User input star rating out of 10
  personalRating: integer("personal_rating"), // User personal rating (1-5 stars)
  lastWatchedDate: timestamp("last_watched_date"), // When the movie was last watched
  location: text("location"), // Physical location of the movie
  
  // Loan tracking fields
  isLoaned: boolean("is_loaned").default(false), // Whether the movie is currently loaned out
  loanedToName: text("loaned_to_name"), // Name of person who borrowed the movie
  loanDate: timestamp("loan_date"), // When the movie was loaned out
  expectedReturnDate: timestamp("expected_return_date"), // Expected return date
  actualReturnDate: timestamp("actual_return_date"), // Actual return date (when returned)
  loanNotes: text("loan_notes"), // Additional notes about the loan
  
  // Media and links
  posterUrl: text("poster_url"), // Primary/selected image
  backdropUrl: text("backdrop_url"), // Backdrop image from TMDb
  availableImages: text("available_images").array().$type<string[]>().default([]), // All available image URLs with metadata
  youtubeTrailerUrl: text("youtube_trailer_url"), // Scraped trailer link (editable)
  infoPageLink: text("info_page_link"), // URL of metadata source page (LDDB, IMDb, etc.)
  
  // System fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMovieSchema = createInsertSchema(movies).omit({
  id: true,
  createdAt: true,
});

export const updateMovieSchema = insertMovieSchema.partial();

export type InsertMovie = z.infer<typeof insertMovieSchema>;
export type UpdateMovie = z.infer<typeof updateMovieSchema>;
export type Movie = typeof movies.$inferSelect;

// User schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial();

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

// Session schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
