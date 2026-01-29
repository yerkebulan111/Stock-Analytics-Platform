const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const Stock = require('./models/Stock');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));


mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => { console.error('MongoDB connection error:', err);
        process.exit(1);
});


const parseDate = (dateStr) => {
  const parts = dateStr.split(' ')[0]; 
  return new Date(parts);
};


const calculateStats = (values) => {
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, stdDev: 0 };
  }

  const sum = values.reduce((acc, val) => acc + val, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  
  const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    avg: parseFloat(avg.toFixed(4)),
    min: parseFloat(min.toFixed(4)),
    max: parseFloat(max.toFixed(4)),
    stdDev: parseFloat(stdDev.toFixed(4))
  };
};


app.get('/api/companies', async (req, res) => {
  try {
    const companies = await Stock.distinct('Company');
    res.json({ companies: companies.sort() });
  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});


app.get('/api/measurements', async (req, res) => {
  try {
    const { field, start_date, end_date, company } = req.query;

    
    if (!field) {
      return res.status(400).json({ error: 'Field parameter is required' });
    }

    const validFields = ['Open', 'High', 'Low', 'Close', 'Volume'];
    if (!validFields.includes(field)) {
      return res.status(400).json({ 
        error: `Invalid field. Must be one of: ${validFields.join(', ')}` 
      });
    }

    
    let query = {};

    if (company) {
      query.Company = company;
    }

    if (start_date || end_date) {
      query.Date = {};
      if (start_date) {
        query.Date.$gte = start_date;
      }
      if (end_date) {
        query.Date.$lte = end_date + ' 23:59:59';
      }
    }


    const data = await Stock.find(query)
      .select(`Date ${field} Company`)
      .sort({ Date: 1 }); 

    if (data.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for the specified criteria' 
      });
    }

    
    const formattedData = data.map(doc => ({
      timestamp: doc.Date,
      [field]: doc[field],
      company: doc.Company
    }));

    res.json(formattedData);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});


app.get('/api/measurements/metrics', async (req, res) => {
  try {
    const { field, start_date, end_date, company } = req.query;

    
    if (!field) {
      return res.status(400).json({ error: 'Field parameter is required' });
    }

    const validFields = ['Open', 'High', 'Low', 'Close', 'Volume'];
    if (!validFields.includes(field)) {
      return res.status(400).json({ 
        error: `Invalid field. Must be one of: ${validFields.join(', ')}` 
      });
    }

    
    let query = {};

    if (company) {
      query.Company = company;
    }


    if (start_date || end_date) {
      query.Date = {};
      if (start_date) {
        query.Date.$gte = start_date;
      }
      if (end_date) {
        query.Date.$lte = end_date + ' 23:59:59';
      }
    }


    const data = await Stock.find(query).select(field);

    if (data.length === 0) {
      return res.status(404).json({ 
        error: 'No data found for the specified criteria' 
      });
    }


    const values = data.map(doc => doc[field]);
    const stats = calculateStats(values);

    res.json({
      field,
      count: values.length,
      ...stats
    });
  } catch (error) {
    console.error('Error calculating metrics:', error);
    res.status(500).json({ error: 'Failed to calculate metrics' });
  }
});


app.get('/api/date-range', async (req, res) => {
  try {
    const minDate = await Stock.findOne().sort({ Date: 1 }).select('Date');
    const maxDate = await Stock.findOne().sort({ Date: -1 }).select('Date');

    if (!minDate || !maxDate) {
      return res.status(404).json({ error: 'No data found' });
    }

    res.json({
      minDate: minDate.Date.split(' ')[0],
      maxDate: maxDate.Date.split(' ')[0]
    });
  } catch (error) {
    console.error('Error fetching date range:', error);
    res.status(500).json({ error: 'Failed to fetch date range' });
  }
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});