import React, { useState, useEffect, useContext } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import axios from "axios";
import ArgonBox from "components/ArgonBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import DetailedStatisticsCard from "examples/Cards/StatisticsCards/DetailedStatisticsCard";
import MyMapComponent from "./MyMapComponent";
import VesselDetailsTable from "./VesselDetailsTable";
import DashCard from "./DashCard";
import PieChartComponent from "./PieChartComponent"; // Import PieChartComponent
import BarChartComponent from './BarChartComponent';
import Loader from "./Loader"; // Import the Loader component
import { AuthContext } from "../../AuthContext";

function Dashboardcopy() {
  const [vessels, setVessels] = useState([]);
  const [error, setError] = useState(null);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightRow, setHighlightRow] = useState(null);
  const { role,id} = useContext(AuthContext); 
  // New states for counts
  const [shipsAtSeaCount, setShipsAtSeaCount] = useState(0);
  const [shipsAtAnchorageCount, setShipsAtAnchorageCount] = useState(0);
  const [shipsAtBerthCount, setShipsAtBerthCount] = useState(0);
  const [totalShip, setTotalShip] = useState(0);
  const [destinationOptions, setDestinationOptions] = useState([]);
  const [loading, setLoading] = useState(false); // New loading state


  // Example data for bar chart
const barChartData = [
  { month: "January", atSea: 30, atAnchorage: 25, atBerth: 15 },
  { month: "February", atSea: 28, atAnchorage: 22, atBerth: 18 },
  { month: "March", atSea: 35, atAnchorage: 30, atBerth: 20 },
  { month: "April", atSea: 40, atAnchorage: 35, atBerth: 25 },
  { month: "May", atSea: 45, atAnchorage: 32, atBerth: 30 },
  { month: "June", atSea: 50, atAnchorage: 40, atBerth: 35 },
  { month: "July", atSea: 55, atAnchorage: 38, atBerth: 40 },
  { month: "August", atSea: 60, atAnchorage: 45, atBerth: 50 },
  { month: "September", atSea: 50, atAnchorage: 42, atBerth: 45 },
  { month: "October", atSea: 48, atAnchorage: 50, atBerth: 55 },
  { month: "November", atSea: 35, atAnchorage: 38, atBerth: 40 },
  { month: "December", atSea: 40, atAnchorage: 45, atBerth: 50 }
];

const [pieChartData, setPieChartData] = useState([]);


  const handleRefreshTable = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Update key to force refresh
  };

  const handleRowHighlight = (vessel) => {
    setHighlightRow(vessel); // Set the vessel to be highlighted
    setSelectedVessel(vessel);
    console.log(vessel);
  };

  const CustomIcon = () => (
    <img src="/ship-berth.png" alt="Ship at berth" style={{ width: "40px", height: "40px" }} />
  );

  const handleRowClick = (vessel) => {
    setSelectedVessel(vessel);
    console.log(vessel);
  };

  const calculateMapCenter = () => {
    if (vessels.length === 0) return [0, 0];
    const latSum = vessels.reduce((sum, vessel) => sum + vessel.lat, 0);
    const lngSum = vessels.reduce((sum, vessel) => sum + vessel.lng, 0);
    return [latSum / vessels.length, lngSum / vessels.length];
  };

  const vesselsToDisplay = selectedVessel ? [selectedVessel] : vessels;

  const center = selectedVessel ? [selectedVessel.lat, selectedVessel.lng] : calculateMapCenter();
  const zoom = selectedVessel ? 2 : 6;

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
  setLoading(true);

  fetchVessels(role, id)
    .then(filteredData => {
      // Process filtered data

      const transformedData = filteredData.map((vessel) => ({
        name: vessel.AIS.NAME || '',
        imo: vessel.AIS.IMO || 0,
        lat: vessel.AIS.LATITUDE || 0,
        lng: vessel.AIS.LONGITUDE || 0,
        heading: vessel.AIS.HEADING || 0,
        status: vessel.AIS.NAVSTAT || 0,
        eta: vessel.AIS.ETA || 0,
        destination: vessel.AIS.DESTINATION || '',
      }));


      setVessels(transformedData);
      console.log(filteredData);

      // Process data for charts, etc.
      const destinations = [...new Set(transformedData.map(vessel => vessel.destination))];
      setDestinationOptions(destinations);
      console.log(destinations);
      
      const destinationCounts = transformedData.reduce((acc, vessel) => {
        acc[vessel.destination] = (acc[vessel.destination] || 0) + 1;
        return acc;
      }, {});

      const updatedPieChartData = Object.entries(destinationCounts).map(([name, value]) => ({ name, value }));
      setPieChartData(updatedPieChartData);

      // Count vessels by status (NAVSTAT)
      setShipsAtSeaCount(transformedData.filter(vessel => vessel.status === 0).length);
      setShipsAtAnchorageCount(transformedData.filter(vessel => vessel.status === 1 || vessel.status === 2 || vessel.status === 3).length);
      setShipsAtBerthCount(transformedData.filter(vessel => vessel.status === 5 || vessel.status === 7).length);
      console.log(shipsAtBerthCount);
    })
    .catch((err) => {
      console.error("Error fetching vessel data:", err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
}, [role, id]);



 
  if (loading) {
    return <Loader />; // Show loader while fetching data
  }
  return (
    <DashboardLayout>
      <DashboardNavbar showButton={true} dropdownOptions={destinationOptions} />
      <ArgonBox py={3}>
        <Grid container spacing={3} mb={0}>
          {/* Statistics Cards */}
          <Grid item xs={12} md={6} lg={3}>
            <DetailedStatisticsCard
              title="Ships at Sea"
              count={shipsAtSeaCount}
              icon={{ color: "info", component: <i className="fa fa-compass" /> }}
              percentage={{ color: "success", count: "+55%", text: "since yesterday" }}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <DetailedStatisticsCard
              title="Ships at Anchorage"
              count={shipsAtAnchorageCount}
              icon={{ color: "error", component: <i className="fa fa-anchor" /> }}
              percentage={{ color: "success", count: "+3%", text: "since last week" }}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <DetailedStatisticsCard
              title="Ships at Berth"
              count={shipsAtBerthCount}
              icon={{ color: "warning", component: <CustomIcon /> }}
              percentage={{ color: "error", count: "-2%", text: "since last quarter" }}
            />
          </Grid>
          <Grid item xs={12} md={6} lg={3}>
            <DetailedStatisticsCard
              title="Total Ships"
              count={vessels.length}
              icon={{ color: "primary", component: <i className="fa fa-ship" /> }}
              percentage={{ color: "success", count: "+5%", text: "than last month" }}
            />
          </Grid>
        </Grid>

        <Grid container spacing={0} mt={6}>
          <Grid item xs={12} md={6} lg={12}>
            <DashCard
              title="Vessels Subscribed"
              count="20"
              icon={{ color: "info", component: <i className="fa fa-database" /> }}
              percentage={{ color: "success", count: "+55%", text: "since yesterday" }}
              onRefresh={handleRefreshTable}
              onHighlight={handleRowHighlight}
            />
          </Grid>
        </Grid>

        <Grid container spacing={3} mt={1}>
          {/* Card for Map */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: "17px",
                boxShadow: 1,
                padding: 2,
                height: "550px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <CardContent
                sx={{
                  backgroundColor: "#ffffff",
                  padding: 0,
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <MyMapComponent
                  zoom={zoom}
                  center={center}
                  vessels={vesselsToDisplay}
                  selectedVessel={selectedVessel}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Card for Table */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                backgroundColor: "#ffffff",
                borderRadius: "17px",
                boxShadow: 1,
                padding: 2,
                height: "550px",
              }}
            >
              <CardContent
                sx={{
                  backgroundColor: "#ffffff",
                  padding: 0,
                  height: "100%",
                }}
              >
                <VesselDetailsTable
                  key={refreshKey}
                  vessels={vessels}
                  onRowClick={handleRowClick}
                  highlightRow={highlightRow}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        {/* Conditionally render Pie Chart */}
        {vessels.length > 0 && (
          <Grid container spacing={3} mt={1}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '500px' }}>
                <CardContent sx={{  width: '100%' }}>
                  <PieChartComponent data={pieChartData} />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '500px' }}>
                <CardContent sx={{ width: '100%' }}>
                <BarChartComponent data={barChartData} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
        <br></br>
      </ArgonBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Dashboardcopy;
