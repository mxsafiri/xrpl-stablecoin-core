import { Handler } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, user_id, notification_id } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'getNotifications':
        if (!user_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'user_id required' })
          };
        }

        const notifications = await sql`
          SELECT * FROM notifications 
          WHERE user_id = ${user_id}
          ORDER BY created_at DESC
          LIMIT 50
        `;

        const unreadCount = await sql`
          SELECT COUNT(*) as count FROM notifications 
          WHERE user_id = ${user_id} AND status = 'unread'
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            notifications,
            unread_count: parseInt(unreadCount[0].count)
          })
        };

      case 'markAsRead':
        if (!notification_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'notification_id required' })
          };
        }

        await sql`
          UPDATE notifications 
          SET status = 'read', read_at = NOW()
          WHERE id = ${notification_id}
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Notification marked as read'
          })
        };

      case 'markAllAsRead':
        if (!user_id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'user_id required' })
          };
        }

        await sql`
          UPDATE notifications 
          SET status = 'read', read_at = NOW()
          WHERE user_id = ${user_id} AND status = 'unread'
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'All notifications marked as read'
          })
        };

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

  } catch (error: any) {
    console.error('Notifications API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Notifications API failed',
        error: error.message
      })
    };
  }
};
