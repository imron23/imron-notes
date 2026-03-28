package main

import (
	"log"
	"net/http"

	"notion-backend/internal/config"
	"notion-backend/internal/db"
	"notion-backend/internal/handlers"
	"notion-backend/internal/repository"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/joho/godotenv"
)

func main() {
	// Optional load .env
	_ = godotenv.Load()

	cfg := config.LoadConfig()

	// Initialize DB & Redis
	database, err := db.InitDB(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v\n", err)
	}
	defer database.Close()

	// Init Repo & Handlers
	docRepo := repository.NewDocumentRepository(database)
	docHandler := handlers.NewDocumentHandler(docRepo)
	authHandler := handlers.NewAuthHandler()

	// Setup Router
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*", "http://localhost:5173", "http://localhost:3000"}, // Allow frontend
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("OK"))
	})

	r.Post("/api/auth/login", authHandler.Login)

	r.Group(func(r chi.Router) {
		r.Use(handlers.AuthMiddleware)
		r.Route("/api/documents", func(r chi.Router) {
			r.Mount("/", docHandler.Routes())
		})
	})

	log.Printf("Backend listening on port %s\n", cfg.Port)
	if err := http.ListenAndServe(":"+cfg.Port, r); err != nil {
		log.Fatal(err)
	}
}
