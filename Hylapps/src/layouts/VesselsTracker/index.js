import React, { useState, useEffect, useContext } from "react";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import axios from "axios";
import ArgonBox from "components/ArgonBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import MyMapComponent from "./MyMapComponent";
import { ToastContainer, toast } from 'react-toastify'; // Import Toast components
import 'react-toastify/dist/ReactToastify.css'; // Import the CSS
// import HistoryTable from "./HistoryTable";
import Vesseleighthours from './Vesseleighthours';
import Vesseltwentyfourhours from './Vesseltwentyfourhours';
import Loader from "./Loader";
import { AuthContext } from "../../AuthContext";

function Geofence() {
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [vesselEntries, setVesselEntries] = useState({});
  const [notifications, setNotifications] = useState([]);
  const { role, id } = useContext(AuthContext);
  const [loading, setLoading]=useState(true);
  const [error, setError ]=useState("");

  const handleRowClick = (vessel) => {
    console.log('Row click event received with vessel:', vessel); // Log received vessel
    const selected = vessels.find(v => v.name === vessel.name);
    if (selected) {
      setSelectedVessel(selected);
      console.log("Selected vessel:", selected);
    }
  };
  


  const calculateMapCenter = () => {
    if (vessels.length === 0) return [0, 0];
    const latSum = vessels.reduce((sum, vessel) => sum + vessel.lat, 0);
    const lngSum = vessels.reduce((sum, vessel) => sum + vessel.lng, 0);
    return [latSum / vessels.length, lngSum / vessels.length];
  };

  const center = selectedVessel ? [selectedVessel.lat, selectedVessel.lng] : calculateMapCenter();
  const zoom = selectedVessel ? 10 : 6;

 
  // useEffect(() => {
  //   const baseURL = process.env.REACT_APP_API_BASE_URL;
  
  //   axios.get(`${baseURL}/api/get-tracked-vessels`)
  //     .then((response) => {
  //       // Apply filtering logic based on role
  //       const filteredData = response.data.filter((vessel) => {
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
  
  //       // Map filtered data to formatted data structure
  //       const formattedData = filteredData.map((vessel) => ({
  //         name: vessel.AIS.NAME || "",
  //         lat: Number(vessel.AIS.LATITUDE) || 0,
  //         lng: Number(vessel.AIS.LONGITUDE) || 0,
  //         heading: vessel.AIS.HEADING || 0,
  //         destination: vessel.AIS.DESTINATION || "",
  //         speed: vessel.AIS.SPEED || 0,
  //       }));
  
  //       setVessels(formattedData);
  //       setLoading(false);
  //     })
  //     .catch((err) => {
  //       console.error("Error fetching vessel data:", err);
  //       setLoading(false);
  //     });
  // }, [role, id]);
  
  // Log the vesselEntries whenever it changes
  
  
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
        lat: vessel.AIS.LATITUDE || 0,
        lng: vessel.AIS.LONGITUDE || 0,
        heading: vessel.AIS.HEADING || 0,
        destination: vessel.AIS.DESTINATION || '',
        status: vessel.AIS.NAVSTAT || 0,
      }));


      setVessels(transformedData);
      console.log(transformedData);

      // Process data for charts, etc.
      const destinations = [...new Set(filteredData.map(vessel => vessel.destination))];
      setDestinationOptions(destinations);

      const destinationCounts = filteredData.reduce((acc, vessel) => {
        acc[vessel.destination] = (acc[vessel.destination] || 0) + 1;
        return acc;
      }, {});

      const updatedPieChartData = Object.entries(destinationCounts).map(([name, value]) => ({ name, value }));
      setPieChartData(updatedPieChartData);

      // Count vessels by status (NAVSTAT)
      setShipsAtSeaCount(filteredData.filter(vessel => vessel.status === 0).length);
      setShipsAtAnchorageCount(filteredData.filter(vessel => vessel.status === 1 || vessel.status === 2 || vessel.status === 3).length);
      setShipsAtBerthCount(filteredData.filter(vessel => vessel.status === 5 || vessel.status === 7).length);
    })
    .catch((err) => {
      console.error("Error fetching vessel data:", err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
}, [role, id]);


  
  
  
  useEffect(() => {
    console.log("Vessel Entries Updated:", vesselEntries);
  }, [vesselEntries]);

  // Modify handleNewGeofenceEntry to include the vessel's name and geofence details
  const handleNewGeofenceEntry = (message, vessel) => {
    setNotifications((prev) => [
      ...prev,
      {
        title: `${vessel.name} has entered ${message.title}`,
        date: new Date().toLocaleTimeString(),
        image: <img src={team2} alt="vessel" />,
      }
    ]);
  };

  // Disable keyboard shortcuts and mouse zoom
  useEffect(() => {
    const handleKeyDown = (event) => {
     
      if (event.key.startsWith('F') || (event.ctrlKey && (event.key === '+' || event.key === '-'))) {
        event.preventDefault();
        toast.warning("THIS FUNCTION IS DISABLED"); // Show toast alert
      }
    };

    const handleWheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
        toast.warning("THIS FUNCTION IS DISABLED"); // Show toast alert
      }
    };

    // Add event listeners
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });

    // Cleanup event listeners on component unmount
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);
  if (loading){
    return<Loader/>;
  }

  return (
    <DashboardLayout>
      {/* Marquee for 'Under Development' */}
      <div style={{
        backgroundColor: '#ffcc00', 
        color: '#ffcc00', 
        fontSize: '16px', 
        fontWeight: 'bold', 
        textAlign: 'center', 
        padding: '10px', 
        marginBottom: '20px'
      }}>
        <marquee>This is UNDER DEVELOPMENT | This is UNDER DEVELOPMENT |This is UNDER DEVELOPMENT|This is UNDER DEVELOPMENT |This is UNDER DEVELOPMENT|This is UNDER DEVELOPMENT</marquee>
      </div>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} /> {/* Toast container */}
      <DashboardNavbar vesselEntries={vesselEntries} />
      <ArgonBox py={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <MyMapComponent
                  zoom={zoom}
                  center={center}
                  vessels={vessels}
                  selectedVessel={selectedVessel}
                  setVesselEntries={setVesselEntries}
                  onNewGeofenceEntry={handleNewGeofenceEntry}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        <Grid container spacing={3} mt={1}>
          <Grid item xs={12} md={6} style={{cursor:'pointer'}}>
            <h3 style={{color:'#0F67B1',marginBottom:'5px'}}>Ship Within 24 hours<sup style={{color:"orange",fontSize:"12px"}}>(Under Development)</sup></h3>
              <Vesseleighthours
                  vesselEntries={vesselEntries}
                  vessels={vessels}
                  onRowClick={handleRowClick}
                />
          </Grid>
          <Grid item xs={12} md={6} style={{cursor:'pointer'}}>
          <h3 style={{color:'#0F67B1',marginBottom:'5px'}}>Ship beyond 24 hours <sup style={{color:"orange",fontSize:"12px"}}>(Under Development)</sup></h3>
              <Vesseltwentyfourhours
              
                  vesselEntries={vesselEntries}
                  vessels={vessels}
                  onRowClick={handleRowClick}
                />
          </Grid>
        </Grid>
      </ArgonBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Geofence;
