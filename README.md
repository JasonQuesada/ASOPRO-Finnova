# Finnova ASOPRO

Finnova is an **educational financial simulator for students**, developed for ASOPRO to provide a practical environment where users can learn and experiment with financial management concepts.

The system allows users to simulate financial scenarios such as loans, transactions, and notifications within a controlled environment, supporting learning through an interactive web experience.

> **Note:** Finnova is an educational simulator. Operations and data used within the platform do not represent real financial transactions.

## Technologies

* React
* JavaScript
* Vite
* Firebase Authentication
* Cloud Firestore
* Firebase Hosting
* Tailwind CSS
* shadcn/ui
* Radix UI
* Lucide React
* Recharts
* ESLint
* GitHub Actions

## Features

Finnova provides features focused on financial simulation and learning, including:

* User authentication.
* Loan simulation.
* Recording and viewing simulated transactions.
* Notification system.
* Financial data visualization through charts.
* Data persistence using Cloud Firestore.
* Responsive web interface.
* Navigation using React Router.
* Deployment through Firebase Hosting.
* CI/CD workflow integration using GitHub Actions.

## Educational Purpose

The project aims to support financial education through a practical application that allows students to interact with different scenarios and understand financial concepts in a safe and controlled environment.

Finnova **does not process real money, execute real financial transactions, or constitute a banking or financial platform**.

## Requirements

To run the project locally, you need:

* Node.js
* npm
* A Firebase configuration with access to the services used by the application.

## Environment Variables

Environment-specific configuration is managed through environment variables.

Create a `.env` file in the project root using `.env.example` as a reference.

The application uses the following variables:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

The `.env` file is excluded through `.gitignore`.

## Firebase

Finnova uses Firebase for authentication, database, and hosting services.

The project configuration is defined through:

```text
.firebaserc
firebase.json
firestore.rules
firestore.indexes.json
```

## Firestore

Cloud Firestore is used as the database for storing the information required for the simulations.

Security rules are defined in:

```text
firestore.rules
```

The indexes required by the application's queries are defined in:

```text
firestore.indexes.json
```

## CI/CD

The project uses GitHub Actions to automate the build and deployment process.

The workflow is located at:

```text
.github/workflows/main.yml
```

The workflow performs:

1. Repository checkout.
2. Node.js setup.
3. Dependency installation.
4. Production build.
5. Deployment to Firebase Hosting.

Deployment credentials are managed through GitHub Secrets and are not included in the source code.

## Project Structure

```text
ASOPRO-Finnova/
├── .github/
│   └── workflows/
├── src/
├── .env.example
├── .firebaserc
├── .gitignore
├── components.json
├── eslint.config.js
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── index.html
├── jsconfig.json
├── package.json
├── package-lock.json
└── README.md
```

## Security

This repository is public and must not contain:

* Environment variables with real values.
* Passwords.
* Access tokens.
* Service account credentials.
* Google/Firebase credential files.
* Secrets used by external services.
* Personal or sensitive user information.

Local environment variables are managed through `.env`, while secrets used by CI/CD are managed through GitHub Secrets.

## Project Nature

Finnova is an **educational and simulation project**. The information generated within the platform is intended exclusively for academic and learning purposes.

The system should not be used as a substitute for professional financial advice or as a platform for conducting real financial operations.

## Project Status

Project developed for ASOPRO as a financial simulation tool focused on student learning.

The repository contains the source code, configuration, and documentation required to understand, run, and maintain the project.