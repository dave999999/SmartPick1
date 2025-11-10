# SmartPick Admin Dashboard Guide

## Overview

The SmartPick Admin Dashboard provides comprehensive management capabilities for the platform, allowing administrators to manage partners, users, offers, and review pending applications.

## Features

### 1. Dashboard Overview
- **Statistics Cards**: View total partners, users, offers, and pending applications
- **Quick Actions**: Direct access to common administrative tasks
- **Real-time Updates**: All data updates automatically when changes are made

### 2. Partners Management
- **View All Partners**: Complete list with search and filtering
- **Edit Partner Details**: Update business information, contact details, location
- **Status Management**: Approve, disable, or reject partners
- **Location Management**: Update GPS coordinates for accurate mapping

### 3. Pending Partners
- **Application Review**: Dedicated section for pending partner applications
- **Detailed View**: Complete application information review
- **Quick Actions**: Approve or reject applications with one click
- **Application History**: Track when applications were submitted

### 4. Users Management
- **User Directory**: Complete list of all platform users
- **Role Management**: Change user roles (customer, partner, admin)
- **Status Control**: Enable or disable user accounts
- **Activity Tracking**: View registration and last login dates

### 5. New Users
- **Recent Registrations**: Users who joined in the last 4 days
- **Registration Analytics**: Breakdown by user type and registration patterns
- **Activity Monitoring**: Track user engagement from registration

### 6. Offers Management
- **Offer Directory**: Complete list of all offers in the system
- **Content Management**: Edit offer details, pricing, and descriptions
- **Status Control**: Enable, disable, or mark offers as expired
- **Partner Association**: View which partner created each offer

## Access Control

### Admin User Creation

To create an admin user:

1. **Create Auth User**: First create a user through Supabase Auth (sign up normally)
2. **Update Role**: Run the SQL script to make the user an admin:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'your-admin-email@example.com';
   ```

### Admin Routes

- `/admin` - Redirects to admin dashboard (with access check)
- `/admin-dashboard` - Main admin interface

## Navigation

The admin dashboard uses a tabbed interface:

1. **Overview** - Dashboard statistics and quick actions
2. **Partners** - All partners management
3. **Pending** - Pending partner applications (shows count badge)
4. **Users** - All users management
5. **New Users** - Recent user registrations
6. **Offers** - All offers management

## Key Functions

### Partner Management
- **Approve**: Change status from PENDING to APPROVED
- **Disable**: Change status to DISABLED (can be re-enabled)
- **Edit**: Update all partner information including location
- **Delete**: Permanently remove partner (use with caution)

### User Management
- **Edit Profile**: Update user name, email, and role
- **Status Toggle**: Enable/disable user accounts
- **Role Assignment**: Change between customer, partner, and admin roles
- **Delete**: Permanently remove user account

### Offer Management
- **Content Editing**: Update titles, descriptions, pricing
- **Status Control**: Enable/disable offers
- **Category Management**: Change offer categories
- **Quantity Control**: Update available quantities

## Security Features

- **Admin-Only Access**: All admin functions require admin role
- **Authentication Check**: Automatic redirect for non-authenticated users
- **Role Verification**: Server-side role checking for all admin operations
- **Audit Trail**: All changes are logged with timestamps

## Data Management

### Search and Filtering
- **Text Search**: Search across names, emails, business names
- **Status Filters**: Filter by approval status, user status, offer status
- **Category Filters**: Filter offers by category
- **Date Filters**: Filter users by registration date

### Bulk Operations
- **Status Changes**: Quickly approve/disable multiple items
- **Data Export**: Export functionality for reporting
- **Batch Updates**: Efficient handling of multiple changes

## Troubleshooting

### Common Issues

1. **Access Denied**: Ensure user has admin role in database
2. **Data Not Loading**: Check Supabase connection and RLS policies
3. **Changes Not Saving**: Verify admin permissions and database constraints

### Admin User Setup

If you need to create an admin user:

```sql
-- Method 1: Update existing user
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- Method 2: Make first user admin
UPDATE users SET role = 'admin' WHERE id = (
  SELECT id FROM users ORDER BY created_at LIMIT 1
);
```

## Best Practices

1. **Regular Review**: Check pending applications daily
2. **Data Validation**: Verify partner information before approval
3. **Status Management**: Use disable instead of delete when possible
4. **Security**: Regularly audit admin user list
5. **Backup**: Regular database backups before bulk operations

## API Endpoints

The admin dashboard uses these key API functions:

- `getAllPartners()` - Fetch all partners
- `getPendingPartners()` - Fetch pending applications
- `getAllUsers()` - Fetch all users
- `getNewUsers()` - Fetch recent registrations
- `getAllOffers()` - Fetch all offers
- `updatePartner()` - Update partner information
- `approvePartner()` - Approve partner application
- `disablePartner()` - Disable partner account

## Support

For technical issues or questions about the admin dashboard, refer to the system documentation or contact the development team.