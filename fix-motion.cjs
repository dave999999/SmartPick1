const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/PartnerDashboardV3.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// First remove import
content = content.replace(/import \{ motion, AnimatePresence \} from 'framer-motion';?\n?/, '');

// Replace motion tags
content = content.replace(/<motion\.button/g, '<button');
content = content.replace(/<\/motion\.button>/g, '</button>');
content = content.replace(/<motion\.div/g, '<div');
content = content.replace(/<\/motion\.div>/g, '</div>');

// Remove animation props
content = content.replace(/\s+whileTap=\{\{[^}]+\}\}/g, '');
content = content.replace(/\s+initial=\{\{[^}]+\}\}/g, '');
content = content.replace(/\s+animate=\{\{[^}]+\}\}/g, '');
content = content.replace(/\s+transition=\{\{[^}]+\}\}/g, '');

// Replace AnimatePresence
content = content.replace(/<AnimatePresence>/g, '<>');
content = content.replace(/<\/AnimatePresence>/g, '</>');

fs.writeFileSync(filePath, content);
console.log('✅ Fixed!');
