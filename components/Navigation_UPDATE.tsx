// INSTRUÇÕES PARA ATUALIZAR Navigation.tsx
// 
// Adicione o seguinte item no menu HelloClient, logo após "Oportunidades":
//
// {
//   id: 'team',
//   label: 'Equipe',
//   icon: Users,
//   permission: 'manage_team' // Apenas admin pode ver
// },
//
// No início do arquivo, adicione o import:
// import { Users } from 'lucide-react';
//
// E adicione a verificação de permissão ao renderizar os itens:
// 
// {helloClientItems.map((item) => {
//   // Verificar permissão se o item tiver
//   if (item.permission && !hasPermission(item.permission)) {
//     return null;
//   }
//   
//   return (
//     <button
//       key={item.id}
//       onClick={() => setActiveView(item.id)}
//       className={...}
//     >
//       ...
//     </button>
//   );
// })}
//
// No MainApp.tsx, adicione o case para renderizar TeamManagement:
//
// case 'team':
//   return (
//     <ProtectedRoute requiredPermission="manage_team" currentUser={currentUser}>
//       <TeamManagement currentUser={currentUser} />
//     </ProtectedRoute>
//   );
