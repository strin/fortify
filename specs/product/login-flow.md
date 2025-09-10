# Login Flow

This PRD defines the login flow for the Fortify platform.

## Overview

The login flow for the Fortify platform is as follows:

1. User clicks the login button in the top right corner of the navbar of the landing page.
2. User is redirected to the login page
3. User can login with one of the methods: Github.
4. User is redirected to `/home`.

## Default home page

Currently, the home page should redirect to `/scan-targets`. It'll show the list of scan targets for the user. This is similar to Vercel: after logging in, the user is redirected to the project management page.