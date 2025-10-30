# Bakery Box Web Application
        
I want to generate an app for my project "BakeryBox." The app should allow users to browse bakeries and their "Mystery Box" offers, subscribe, and place simple orders. 
* App Features:
  * Home Page / Bakery List: Display a list of bakeries (name, logo, short description), each bakery shows a "Mystery Box" offer (price, description), and a "Subscribe" button for each bakery.
  * Subscription / Order Flow: Clicking "Subscribe" opens a modal or form for user email + number of boxes, include a "Confirm Order" button.
  * User Authentication: Simple email/password login.
* I will be using an external service for user authentication and data storage.
* Responsive Design: Works on desktop and mobile screens, clean, minimalistic, modern UI.
* I have a list of bakeries and their "Mystery Box" offers that will be used to populate the app.
* Optional Enhancements: Simple toast/snackbar after order submission, display total price in subscription modal.

Made with Floot.

# Instructions

For security reasons, the `env.json` file is not pre-populated — you will need to generate or retrieve the values yourself.  

For **JWT secrets**, generate a value with:  

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then paste the generated value into the appropriate field.  

For the **Floot Database**, download your database content as a pg_dump from the cog icon in the database view (right pane -> data -> floot data base -> cog icon on the left of the name), upload it to your own PostgreSQL database, and then fill in the connection string value.  

**Note:** Floot OAuth will not work in self-hosted environments.  

For other external services, retrieve your API keys and fill in the corresponding values.  

Once everything is configured, you can build and start the service with:  

```
npm install -g pnpm
pnpm install
pnpm vite build
pnpm tsx server.ts
```
