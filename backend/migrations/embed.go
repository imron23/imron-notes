package migrations

import _ "embed"

//go:embed 001_initial_schema.sql
var InitialSchema string
