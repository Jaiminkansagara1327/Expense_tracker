const email = "test_invite_user_" + Date.now() + "@example.com";
const password = "password123";

async function testApi() {
  try {
    const resReg = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test User", email, password })
    });
    const dataReg = await resReg.json();
    const token = dataReg.token;
    
    // Create Group
    const resGrp = await fetch("http://localhost:5000/api/split/groups", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: JSON.stringify({ name: "Test Invite Group", memberIds: [] })
    });
    const grpData = await resGrp.json();
    const groupId = grpData.id;
    
    // Generate Invite
    const resInv = await fetch("http://localhost:5000/api/split/groups/" + groupId + "/invite", {
      method: "POST", headers: { "Authorization": "Bearer " + token }
    });
    console.log("Invite Response Status:", resInv.status);
    const text = await resInv.text();
    console.log("Invite Response Text:", text);

  } catch (e) {
    console.error("Test Error:", e);
  }
}
testApi();
