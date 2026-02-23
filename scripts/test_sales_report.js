(async () => {
  // Mock data for orders
  const mockOrders = [
    {
      orderId: 'ORD001',
      orderDate: new Date(),
      products: [
        { product: { name: 'Product A' }, price: 100, quantity: 2, status: 'delivered' },
        { product: { name: 'Product A Variant' }, price: 50, quantity: 1, status: 'cancelled' }
      ],
      totalAmount: 200,
      coupon: { discount: 10, maxAmount: 15 }
    },
    {
      orderId: 'ORD002',
      orderDate: new Date(),
      products: [
        { product: { name: 'Product B' }, price: 50, quantity: 1, status: 'cancelled' }
      ],
      totalAmount: 50,
      coupon: null
    },
    {
      orderId: 'ORD003',
      orderDate: new Date(),
      products: [
        { product: { name: 'Product C' }, price: 150, quantity: 1, status: 'return accepted' }
      ],
      totalAmount: 150,
      coupon: { discount: 20 }
    }
  ];

  // Require and monkey-patch the orders model before loading controller
  const ordersModelPath = require.resolve('../model/ordersModel');
  const OrdersModel = require(ordersModelPath);

  // Override find and countDocuments
  OrdersModel.find = (filter) => {
    console.log('Mock OrdersModel.find called with filter:', filter);
    // Return a chainable object that supports .populate(), .sort(), .skip(), .limit()
    let _skip = 0;
    let _limit = mockOrders.length;
    const chain = {
      populate() {
        return this;
      },
      sort() {
        return this;
      },
      skip(n) {
        _skip = n || 0;
        return this;
      },
      limit(n) {
        _limit = n || mockOrders.length;
        return this;
      },
      then(resolve) {
        // When awaited, resolve with the sliced result
        resolve(mockOrders.slice(_skip, _skip + _limit));
      },
    };

    return chain;
  };

  OrdersModel.countDocuments = async (filter) => {
    console.log('Mock OrdersModel.countDocuments called with filter:', filter);
    return mockOrders.length;
  };

  // Now require the admin controller which will use the mocked OrdersModel
  const adminController = require('../controller/adminController');

  try {
    const report = await adminController.generateReportData('custom', '2020-01-01', '2030-12-31');
    console.log('\n=== Generated Report Data ===');
    console.log(JSON.stringify(report, null, 2));
  } catch (err) {
    console.error('Error calling generateReportData:', err);
  }

  // Test the Express handler generateSalesReport by mocking req/res
  try {
    const req = {
      body: { reportType: 'custom', startDate: '2020-01-01', endDate: '2030-12-31' },
      query: { page: '1', limit: '2' }
    };

    const res = {
      json(payload) {
        console.log('\n=== generateSalesReport Response ===');
        console.log(JSON.stringify(payload, null, 2));
      },
      status(code) {
        this._status = code;
        return this;
      },
      send(payload) {
        console.log('send called with', payload);
      }
    };

    await adminController.generateSalesReport(req, res);
  } catch (err) {
    console.error('Error calling generateSalesReport:', err);
  }

})();
