import React, { useEffect, useRef, useState,useContext } from "react";
import Chart from "chart.js/auto";
import axios from "axios"; // Make sure to import axios
import './BarChart.css'; // Import the CSS for styling
import { AuthContext } from "../../AuthContext";

function BarChartComponent() {
  const chartRef = useRef(null);
  const [data, setData] = useState([]); // State to hold chart data
  const { role, id } = useContext(AuthContext);

  const downloadChart = () => {
    const link = document.createElement("a");
    link.href = chartRef.current.chart.toBase64Image();
    link.download = "barchart.png";
    link.click();
  };

 
  // Helper function to extract organization part
const extractOrgPart = (value) => {

  let orgId = value.includes('_') ? value.split('_')[1] : value.split('_')[0];
  
  return orgId;
};



  
 // Helper function to fetch tracked vessels by user
const fetchTrackedVesselsByUser = async (userId) => {
  try {
    const baseURL = process.env.REACT_APP_API_BASE_URL;
    const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);
    console.log(response);
    return response.data.filter(vessel => vessel.loginUserId === userId);
   
    
  } catch (error) {
    console.error("Error fetching tracked vessels by user:", error);
    return [];
  }
};

  
 // Helper function to fetch tracked vessels by user
 const fetchTrackedVesselsByOrg = async (orgId) => {
  try {
    const baseURL = process.env.REACT_APP_API_BASE_URL;
    const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);
    console.log(response);
    return response.data.filter(vessel => vessel.OrgId === orgId);
   
    
  } catch (error) {
    console.error("Error fetching tracked vessels by user:", error);
    return [];
  }
};

const fetchVessels = async (role, userId) => {
  try {
    // Fetch the tracked vessels for the user first
    const trackedByUser = await fetchTrackedVesselsByUser(userId);
    console.log(trackedByUser);

    // Ensure tracked vessels have a valid IMO and extract them
    const trackedIMO = trackedByUser.filter(vessel => vessel.IMO).map(vessel => vessel.IMO);

    const baseURL = process.env.REACT_APP_API_BASE_URL;
    // Now fetch all vessels
    const response = await axios.get(`${baseURL}/api/get-tracked-vessels`);
    const allVessels = response.data;

    // Filter vessels based on the role
    const filteredVessels = await Promise.all(allVessels.map(async (vessel) => {
      if (role === 'hyla admin') {
        // For 'hyla admin', return all vessels whose IMO is in the tracked IMO list
        return trackedIMO.includes(vessel.IMO);
      } else if (role === 'organization admin' || role === 'organizational user') {
        // Filter vessels for organizational users based on Org ID
        const userOrgPart = extractOrgPart(userId); // e.g., 'HYLA35'
        console.log('User Org Part:', userOrgPart);

        // Extract orgId from userId
        let orgId = userId.includes('_') ? userId.split('_')[1] : userId.split('_')[0];

        // Now, you need to fetch the IMO values for the user
        const imoValues = await fetchVesselIMOValues(userId); // Await this async function

        // Check if the vessel IMO is in the fetched IMO values
        return imoValues.includes(vessel.IMO);
        
      } else if (role === 'guest') {
        // For 'guest', filter vessels based on loginUserId
        console.log('Guest Vessel IMO:', vessel.IMO);
        return trackedIMO.includes(vessel.IMO);
      }
      return false;
    }));

    // Filtered vessels will now contain true/false values based on the conditions
    const finalVessels = allVessels.filter((vessel, index) => filteredVessels[index]);

    console.log('Filtered Vessels:', finalVessels);
    return finalVessels;

  } catch (error) {
    console.error("Error fetching vessels:", error);
    return [];
  }
};

// The helper function to fetch IMO values for the user
const fetchVesselIMOValues = async (userId) => {
  try {
    // Extract orgId from userId
    let orgId = userId.includes('_') ? userId.split('_')[1] : userId.split('_')[0];
    
    // Define the base URL for the API
    const baseURL = process.env.REACT_APP_API_BASE_URL;

    // Fetch all vessel data for the user
    const response = await axios.get(`${baseURL}/api/get-vessel-tracked-by-user`);

    // Filter vessels by orgId
    const vessels = response.data;
    console.log(vessels);

    const filteredVessels = vessels.filter(vessel => vessel.OrgId === orgId); // Filter based on orgId
    console.log(filteredVessels);

    // Extract IMO values from the filtered vessels
    const imoValues = filteredVessels.map(vessel => vessel.IMO);
    console.log(imoValues);

    return imoValues;

  } catch (error) {
    console.error('Error fetching vessel data:', error);
    throw error;
  }
};


useEffect(() => {
  const baseURL = process.env.REACT_APP_API_BASE_URL;
  // setLoading(true);

  fetchVessels(role, id)
    .then(filteredData => {
      // Process filtered data

      // const transformedData = filteredData.map((vessel) => ({
      //   name: vessel.AIS.NAME || '',
      //   imo: vessel.AIS.IMO || 0,
      //   lat: vessel.AIS.LATITUDE || 0,
      //   lng: vessel.AIS.LONGITUDE || 0,
      //   heading: vessel.AIS.HEADING || 0,
      //   status: vessel.AIS.NAVSTAT || 0,
      //   eta: vessel.AIS.ETA || 0,
      //   destination: vessel.AIS.DESTINATION || '',
      // }));


      // setVessels(filteredData);
      console.log(filteredData);

      
      // Array of months and initialize counts to 0
      const months = [
        "January", "February", "March", "April",
        "May", "June", "July", "August",
        "September", "October", "November", "December"
      ];

      const vesselCountByMonth = months.map(month => ({ month, count: 0 }));

      // Count vessels by month
      filteredData.forEach(vessel => {
        const timestamp = vessel.AIS.TIMESTAMP;
        if (timestamp) {
          const monthIndex = new Date(timestamp).getMonth(); // Get the month index (0-11)
          vesselCountByMonth[monthIndex].count++; // Increment the count for the respective month
        }
      });

      setData(vesselCountByMonth); // Set data to state

      
    })
    .catch((err) => {
      console.error("Error fetching vessel data:", err);
      setError(err.message);
    })
    .finally(() => {
      // setLoading(false);
    });
}, [role, id]);

// useEffect(() => {
//   const baseURL = process.env.REACT_APP_API_BASE_URL;

//   const fetchData = async () => {
//     try {
//       const response = await axios.get(`${baseURL}/api/get-tracked-vessels`);
//       let vessels = response.data; // Assuming your API returns an array of vessel documents

//       // Filtering vessels based on role
//       vessels = vessels.filter(vessel => {
//         if (role === 'hyla admin') {
//           return vessel.trackingFlag;
//         } else if (role === 'organization admin' || role === 'organizational user') {
//           const userOrgPart = id.split('_')[1] || id;
//           const vesselOrgPart = (vessel.loginUserId || '').split('_')[1] || vessel.loginUserId;
//           return vessel.trackingFlag && vesselOrgPart === userOrgPart;
//         } else if (role === 'guest') {
//           return vessel.trackingFlag && vessel.loginUserId === id;
//         }
//         return false;
//       });

//       // Array of months and initialize counts to 0
//       const months = [
//         "January", "February", "March", "April",
//         "May", "June", "July", "August",
//         "September", "October", "November", "December"
//       ];

//       const vesselCountByMonth = months.map(month => ({ month, count: 0 }));

//       // Count vessels by month
//       vessels.forEach(vessel => {
//         const timestamp = vessel.AIS.TIMESTAMP;
//         if (timestamp) {
//           const monthIndex = new Date(timestamp).getMonth(); // Get the month index (0-11)
//           vesselCountByMonth[monthIndex].count++; // Increment the count for the respective month
//         }
//       });

//       setData(vesselCountByMonth); // Set data to state
//     } catch (error) {
//       console.error("Error fetching tracked vessels:", error);
//     }
//   };

//   fetchData();

//   return () => {
//     if (chartRef.current?.chart) {
//       chartRef.current.chart.destroy();
//     }
//   };
// }, [role, id]);


  useEffect(() => {
    const ctx = chartRef.current?.getContext("2d"); // Ensure chartRef is not null

    // Clean up previous instance of chart
    if (chartRef.current?.chart) {
      chartRef.current.chart.destroy();
    }

    if (ctx && data.length > 0) {
      // Initialize the new chart
      chartRef.current.chart = new Chart(ctx, {
        type: "bar",
        data: {
          labels: data.map(d => d.month), // Use months as labels
          datasets: [
            {
              label: "Total Vessels", // Single label for total vessels
              data: data.map(d => d.count), // Total count of vessels per month
              backgroundColor: "#0F67B1", // Chart color
              borderColor: "#0F67B1",
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true, // Make chart responsive to different devices
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 5 // Set step size to 5
              }
            },
            x: {
              title: {
                display: true,
                text: 'Months' // Set title for the x-axis
              },
              ticks: {
                autoSkip: false // Show all ticks (month names)
              }
            }
          },
          plugins: {
            legend: {
              position: 'bottom', // Position legend below the chart
            }
          }
        }
      });
    }

    // Cleanup function to destroy chart on component unmount
    return () => {
      if (chartRef.current?.chart) {
        chartRef.current.chart.destroy();
      }
    };
  }, [data]);

  return (
    <div className="chart-container-wrapper">
      <div className="chart-header">
        <h4 style={{ color: "#344767" }}>Total Ships Tracked <sup style={{color:"orange", fontSize:" 12px"}}>(Based on Months)</sup></h4>
        <button className="download-btn" onClick={downloadChart}>
          <i className="fa fa-download"></i>&nbsp;Download
        </button>
      </div>
      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}

export default BarChartComponent;
