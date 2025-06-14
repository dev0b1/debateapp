const fetch = require('node-fetch');

async function testConversationEndpoints() {
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing Conversation Endpoints...\n');
  
  try {
    // Test 1: Get conversation topics
    console.log('1. Testing GET /api/conversation/topics');
    const topicsResponse = await fetch(`${baseUrl}/api/conversation/topics`);
    const topics = await topicsResponse.json();
    
    console.log(`✅ Topics endpoint returned ${topics.length} topics:`);
    topics.forEach(topic => {
      console.log(`   - ${topic.id}: ${topic.title} (${topic.difficulty})`);
    });
    console.log();
    
    // Test 2: Try to create a room with first topic
    if (topics.length > 0) {
      const firstTopic = topics[0];
      console.log(`2. Testing POST /api/conversation/create-room with topic: ${firstTopic.id}`);
      
      const createRoomResponse = await fetch(`${baseUrl}/api/conversation/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topicId: firstTopic.id })
      });
      
      if (createRoomResponse.ok) {
        const roomData = await createRoomResponse.json();
        console.log('✅ Room creation successful:');
        console.log(`   - Room Name: ${roomData.roomName}`);
        console.log(`   - Server URL: ${roomData.serverUrl}`);
        console.log(`   - Topic: ${roomData.topic.title}`);
        console.log(`   - Token: ${roomData.token ? 'Present' : 'Missing'}`);
      } else {
        const error = await createRoomResponse.json();
        console.log(`❌ Room creation failed (${createRoomResponse.status}):`);
        console.log(`   - Error: ${error.error}`);
        console.log(`   - Message: ${error.message || 'No message'}`);
        
        if (error.setupRequired) {
          console.log('   - Setup Required: LiveKit needs to be configured');
        }
      }
    }
    
    // Test 3: Test with invalid topic ID
    console.log('\n3. Testing POST /api/conversation/create-room with invalid topic ID');
    const invalidResponse = await fetch(`${baseUrl}/api/conversation/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topicId: 'invalid-topic-id' })
    });
    
    if (invalidResponse.status === 404) {
      console.log('✅ Invalid topic ID correctly rejected (404)');
    } else {
      console.log(`❌ Unexpected response for invalid topic: ${invalidResponse.status}`);
    }
    
    // Test 4: Test without topic ID
    console.log('\n4. Testing POST /api/conversation/create-room without topic ID');
    const noTopicResponse = await fetch(`${baseUrl}/api/conversation/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (noTopicResponse.status === 400) {
      console.log('✅ Missing topic ID correctly rejected (400)');
    } else {
      console.log(`❌ Unexpected response for missing topic: ${noTopicResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testConversationEndpoints(); 