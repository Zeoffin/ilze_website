// Debug script to test content saving behavior
// This script simulates the content saving process to identify issues

const testContentScenarios = [
    {
        name: "Empty text content",
        content: [
            { id: 1, content_type: 'text', content: '', order_index: 0 }
        ]
    },
    {
        name: "Text with only BR tag",
        content: [
            { id: 1, content_type: 'text', content: '<br>', order_index: 0 }
        ]
    },
    {
        name: "Text with empty div",
        content: [
            { id: 1, content_type: 'text', content: '<div><br></div>', order_index: 0 }
        ]
    },
    {
        name: "Valid text content",
        content: [
            { id: 1, content_type: 'text', content: 'This is valid content', order_index: 0 }
        ]
    },
    {
        name: "Mixed content with empty items",
        content: [
            { id: 1, content_type: 'text', content: 'Valid content', order_index: 0 },
            { id: 2, content_type: 'text', content: '<br>', order_index: 1 },
            { id: 3, content_type: 'text', content: 'Another valid content', order_index: 2 }
        ]
    },
    {
        name: "All empty content (should delete all)",
        content: [
            { id: 1, content_type: 'text', content: '', order_index: 0 },
            { id: 2, content_type: 'text', content: '<br>', order_index: 1 }
        ]
    }
];

function isContentEmpty(content) {
    const cleanContent = content.trim();
    
    return !cleanContent || 
           cleanContent === '<br>' || 
           cleanContent === '<div><br></div>' ||
           cleanContent === '<p><br></p>' ||
           cleanContent === '<p></p>' ||
           cleanContent.replace(/<[^>]*>/g, '').trim().length === 0;
}

function filterValidContent(contentArray) {
    return contentArray.filter(item => {
        if (item.content_type === 'text') {
            return !isContentEmpty(item.content);
        } else if (item.content_type === 'image') {
            try {
                const imageData = JSON.parse(item.content);
                return imageData.src && !imageData.src.includes('data:');
            } catch (error) {
                return false;
            }
        }
        return false;
    });
}

console.log('Testing content filtering behavior:\n');

testContentScenarios.forEach((scenario, index) => {
    console.log(`${index + 1}. ${scenario.name}`);
    console.log('   Original content:', scenario.content.length, 'items');
    
    const filtered = filterValidContent(scenario.content);
    console.log('   Filtered content:', filtered.length, 'items');
    
    if (filtered.length !== scenario.content.length) {
        const removed = scenario.content.length - filtered.length;
        console.log(`   → ${removed} empty item(s) would be removed`);
    }
    
    console.log('   Filtered items:', filtered.map(item => ({
        id: item.id,
        type: item.content_type,
        content: item.content.substring(0, 30) + (item.content.length > 30 ? '...' : '')
    })));
    
    console.log('');
});

console.log('Key findings:');
console.log('- Empty content blocks are filtered out on the client side');
console.log('- Server receives only non-empty content items');
console.log('- Server deletes existing items not present in the incoming data');
console.log('- This should correctly handle content deletion');

console.log('\nPossible issues to check:');
console.log('1. Are content blocks properly marked with IDs?');
console.log('2. Are empty blocks being created without IDs?');
console.log('3. Is the server-side deletion logic working correctly?');
console.log('4. Are there any race conditions in the save process?');