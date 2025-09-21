// backend/services/notificationCleanup.js
import cron from 'node-cron';

export function startNotificationCleanup(dbPool) {
    if (!dbPool) {
        console.error('Database pool not provided for notification cleanup');
        return;
    }

    // Schedule cleanup to run daily at 2:00 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
        try {
            console.log('Starting automatic notification cleanup...');
            const startTime = new Date();

            const request = dbPool.request();
            const query = `
                DELETE FROM Notifications 
                WHERE CreatedAt < DATEADD(day, -3, GETDATE())
            `;

            const result = await request.query(query);
            const deletedCount = result.rowsAffected[0];
            const endTime = new Date();
            const duration = endTime - startTime;

            console.log(`Notification cleanup completed:`);
            console.log(`- Deleted: ${deletedCount} notifications older than 3 days`);
            console.log(`- Duration: ${duration}ms`);

        } catch (error) {
            console.error('Error during automatic notification cleanup:', error);
        }
    }, {
        scheduled: false, // Don't start immediately
        timezone: "Asia/Ho_Chi_Minh" // Set to Vietnam timezone
    });

    // Start the scheduled job
    cleanupJob.start();
    
    console.log('Notification cleanup scheduler started');
    console.log('- Schedule: Daily at 2:00 AM (Vietnam time)');

    // Optional: Run cleanup once on startup to clean existing old notifications
    setTimeout(async () => {
        try {
            console.log('Running initial notification cleanup...');
            const request = dbPool.request();
            const result = await request.query(`
                DELETE FROM Notifications 
                WHERE CreatedAt < DATEADD(day, -3, GETDATE())
            `);
            console.log(`Initial cleanup: deleted ${result.rowsAffected[0]} old notifications`);
        } catch (error) {
            console.error('Error during initial cleanup:', error);
        }
    }, 5000); // Run after 5 seconds of server startup

    return cleanupJob;
}