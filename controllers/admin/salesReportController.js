const Order = require("../../models/orderModel");
const excel = require('exceljs');
const pdf = require('html-pdf');

const moment = require('moment');





const getSalesReportPage = async (req, res) => {
    try {
        // Log incoming query parameters
        console.log("Incoming Query Parameters:", req.query);

        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        let filter = {};
        const filterType = req.query.filterType || 'yearly';
        const startDate = req.query.startDate ? moment(req.query.startDate).startOf('day').toDate() : null;
        const endDate = req.query.endDate ? moment(req.query.endDate).endOf('day').toDate() : null;

        // Log filter type and date range
        // console.log("Filter Type:", filterType);
        // console.log("Start Date:", startDate);
        // console.log("End Date:", endDate);

        switch (filterType) {
            case 'daily':
                if (startDate && endDate) {
                    filter.createdOn = {
                        $gte: startDate,
                        $lt: moment(endDate).add(1, 'days').startOf('day').toDate(), 
                    };
                } else {
                    
                    filter.createdOn = {
                        $gte: moment().startOf('day').toDate(),
                        $lt: moment().endOf('day').toDate(),
                    };
                }
                break;
            case 'weekly':
                filter.createdOn = {
                    $gte: moment().startOf('week').toDate(),
                    $lt: moment().endOf('week').toDate(),
                };
                break;
            case 'yearly':
                filter.createdOn = {
                    $gte: moment().startOf('year').toDate(),
                    $lt: moment().endOf('year').toDate(),
                };
                break;
            case 'custom':
                if (startDate && endDate) {
                    filter.createdOn = {
                        $gte: startDate,
                        $lt: moment(endDate).add(1, 'days').startOf('day').toDate(), 
                    };
                }
                break;
            default:
                break;
        }

        
        // console.log("Generated Filter:", filter);

        const overallOrderAmount = await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, totalAmount: { $sum: "$totalPrice" } } }
        ]);

        const overallDiscount = await Order.aggregate([
            { $match: filter },
            { $group: { _id: null, totalDiscount: { $sum: "$discount" } } }
        ]);


        
        // console.log("Overall Order Amount:", overallOrderAmount);
        // console.log("Overall Discount:", overallDiscount);

        const totalAmount = overallOrderAmount.length > 0 ? overallOrderAmount[0].totalAmount : 0;
        const totalDiscount = overallDiscount.length > 0 ? overallDiscount[0].totalDiscount : 0;


        const salesReport = await Order.find(filter)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email')
            .populate('orderedItems.productId', 'productName category price')
            .sort({ createdOn: -1 })
            .lean();

        
        console.log("Sales Report Data:", salesReport);

        const salesCount = await Order.countDocuments(filter);
        console.log("Sales Count:", salesCount);

        const totalPages = Math.ceil(salesCount / limit);
        // console.log("Total Pages:", totalPages);

        res.render('admin/salesReport', {
            salesCount,
            totalAmount,
            totalDiscount,
            salesReport,
            currentPage: page,
            totalPages,
            limit,
            filterType,
            startDate: startDate ? moment(startDate).format('YYYY-MM-DD') : null,
            endDate: endDate ? moment(endDate).format('YYYY-MM-DD') : null
        });
    } catch (error) {
        console.log("Error loading sales report:", error);
        res.redirect("/admin/pageError");
    }
};




const downloadSalesReportExcel = async (req, res) => {
    try {
        let filter = {};
        const filterType = req.query.filterType || 'yearly';
        const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
        switch (filterType) {
            case 'daily':
                filter.createdOn = {
                    $gte: moment().startOf('day').toDate(),
                    $lt: moment().endOf('day').toDate(),
                };
                break;
            case 'weekly':
                filter.createdOn = {
                    $gte: moment().startOf('week').toDate(),
                    $lt: moment().endOf('week').toDate(),
                };
                break;
            case 'yearly':
                filter.createdOn = {
                    $gte: moment().startOf('year').toDate(),
                    $lt: moment().endOf('year').toDate(),
                };
                break;
            case 'custom':
                if (startDate && endDate) {
                    filter.createdOn = {
                        $gte: new Date(startDate),
                        $lt: new Date(endDate),
                    };
                }
                break;
            default:
                break;
        }

        const salesReport = await Order.find(filter)
            .populate('userId', 'name email')
            .populate('orderedItems.productId', 'productName category price')
            .lean();
        //  Excel sheet
        const workbook = new excel.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'User Name', key: 'userName', width: 30 },
            { header: 'Products', key: 'Products', width: 50 },
            { header: 'Total Amount', key: 'totalPrice', width: 15 },
            { header: 'Discount', key: 'discount', width: 10 },
            { header: 'Coupon Applied', key: 'couponApplied', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 15 },
            { header: 'Order Status', key: 'status', width: 15 }
        ];
        salesReport.forEach(order => {
            const productDetails = order.orderedItems.map(item =>
                `${item.productId.productName} (${item.size}, Qty: ${item.quantity})`
            ).join(', ');

            worksheet.addRow({
                orderId: order.orderId,
                userName: order.userId ? order.userId.name : 'Guest',
                Products: productDetails,
                totalPrice: order.totalPrice,
                discount: order.discount,
                couponApplied: order.couponApplied ? 'Yes' : 'No',
                paymentMethod: order.paymentMethod,
                orderStatus: order.status
            });
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');
        return workbook.xlsx.write(res).then(() => {
            res.status(200).end();
        });
    } catch (error) {
        console.log("Error generating Excel:", error);    
        res.redirect("/admin/pageError")
    }
};


const downloadSalesReportPDF = async (req, res) => {
    try {
        let filter = {};
        const filterType = req.query.filterType || 'yearly';
        let startDate = null;
        let endDate = null;

       
        switch (filterType) {
            case 'daily':
                startDate = moment().startOf('day').toDate();
                endDate = moment().endOf('day').toDate();
                break;
            case 'weekly':
                startDate = moment().startOf('week').toDate();
                endDate = moment().endOf('week').toDate();
                break;
            case 'yearly':
                startDate = moment().startOf('year').toDate();
                endDate = moment().endOf('year').toDate();
                break;
            case 'custom':
                startDate = req.query.startDate ? new Date(req.query.startDate) : null;
                endDate = req.query.endDate ? new Date(req.query.endDate) : null;
                break;
            default:
                break;
        };

        
        if (startDate && endDate) {
            filter.createdOn = {
                $gte: startDate,
                $lt: endDate,
            };
        }

        const salesReport = await Order.find(filter)
            .populate('userId', 'name email')
            .populate('orderedItems.productId', 'productName category price')
            .lean();

        
        const totalSales = salesReport.length;
        const totalAmount = salesReport.reduce((acc, order) => acc + order.totalPrice, 0);

        let html = `
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                    }
                    h2, h3 {
                        text-align: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th, td {
                        border: 1px solid #dddddd;
                        text-align: left;
                        padding: 8px;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                </style>
            </head>
            <body>
                <h2>Sales Report</h2>
                <h3>Summary</h3>
                <p>Total Sales: ${totalSales}</p>
                <p>Total Amount: ₹${totalAmount.toFixed(2)}</p>`;

        
        if (startDate && endDate) {
            html += `<p>Date Range: ${moment(startDate).format('YYYY-MM-DD')} to ${moment(endDate).format('YYYY-MM-DD')}</p>`;
        }

        html += `
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>User Name</th>
                            <th>Products</th>
                            <th>Total Amount</th>
                            <th>Discount</th>
                            <th>Coupon Applied</th>
                            <th>Payment Method</th>
                           
                        </tr>
                    </thead>
                    <tbody>`;

        salesReport.forEach(order => {
            const productDetails = order.orderedItems.map(item => 
                `${item.productId.productName} (Qty: ${item.quantity})`
            ).join(', ');

            html += `
                <tr>
                    <td>${order.orderId}</td>
                    <td>${order.userId ? order.userId.name : 'Guest'}</td>
                    <td>${productDetails}</td>
                    <td>₹${order.totalPrice.toFixed(2)}</td>
                    <td>₹${order.discount.toFixed(2)}</td>
                    <td>${order.couponApplied ? 'Yes' : 'No'}</td>
                    <td>${order.paymentMethod}</td>
                    
                </tr>`;
        });

        html += `
                    </tbody>
                </table>
            </body>
        </html>`;

        
        const options = {
            format: 'A4',
            orientation: 'portrait',
            border: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        };

        pdf.create(html, options).toStream((err, stream) => {
            if (err) {
                console.error("Error generating PDF:", err);
                return res.redirect("/admin/pageError");
            }
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=sales-report.pdf');
            stream.pipe(res);
        });
    } catch (error) {
        console.log("Error generating PDF:", error);
        res.redirect("/admin/pageError");
    }
};


module.exports = {
    getSalesReportPage,
    downloadSalesReportExcel,
    downloadSalesReportPDF
}