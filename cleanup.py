import shutil
import os

path = r'C:\wamp64\www\copadepor\src\app\api\matches\[matchId]'

if os.path.exists(path):
    shutil.rmtree(path)
    print('Eliminado [matchId]')
else:
    print('No existe')

# Verificar resultado
matches_dir = r'C:\wamp64\www\copadepor\src\app\api\matches'
items = os.listdir(matches_dir)
print('Contenido:', items)
