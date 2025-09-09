const expressServer = `import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});

export default app;
`;

const crudRoutes = `import { Router } from 'express';
import { Request, Response } from 'express';

const router = Router();

// GET all items
router.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Implement get all logic
    res.json({ message: 'Get all items' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement get by ID logic
    res.json({ message: \`Get item \${id}\` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new item
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;
    // TODO: Implement create logic
    res.status(201).json({ message: 'Item created', data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update item
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    // TODO: Implement update logic
    res.json({ message: \`Item \${id} updated\`, data });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // TODO: Implement delete logic
    res.json({ message: \`Item \${id} deleted\` });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
`;

const reactComponent = `import React, { useState, useEffect } from 'react';

interface Props {
  title?: string;
  className?: string;
}

const MyComponent: React.FC<Props> = ({ title = 'Default Title', className = '' }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API call
        const response = await fetch('/api/data');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError('Failed to fetch data');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className={\`my-component \${className}\`}>
      <h2>{title}</h2>
      <div className="content">
        {data.length > 0 ? (
          <ul>
            {data.map((item, index) => (
              <li key={index}>
                {/* TODO: Customize item rendering */}
                {JSON.stringify(item)}
              </li>
            ))}
          </ul>
        ) : (
          <p>No data available</p>
        )}
      </div>
    </div>
  );
};

export default MyComponent;
`;

const templates: Record<string, string> = {
  expressServer,
  crudRoutes,
  reactComponent,
};

export function getTemplate(name: string): string {
  const template = templates[name];
  if (!template) {
    throw new Error(`Template '${name}' not found. Available templates: ${Object.keys(templates).join(', ')}`);
  }
  return template;
}

export function listTemplates(): string[] {
  return Object.keys(templates);
}