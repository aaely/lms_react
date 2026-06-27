import { useState } from 'react'
import { Box, Button, FormControl, Input, InputLabel } from '@mui/material';
import { api } from '../utils/api';
import { user as u } from '../signals/signals';
import { useAtom } from 'jotai';
import axios from 'axios';

function Login() {

    const [form, setForm] = useState({
        username: '',
        password: ''
    })
    const [localView, setLocalView] = useState('login')
    const [user, setUser] = useAtom(u)
    const handleChange = ({target: { id, value}}: any) => {
        setForm({
            ...form,
            [id]: value
        })
    }
    const [error, setError] = useState('')
    const [isError, setIsError] = useState(false)
    const [showMessage, setShowMessage] = useState(false)
    const [accepted, setAccepted] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [resetForm, setResetForm] = useState({ username: '', token: '', new_password: '', confirm: '' })
    const [changeForm, setChangeForm] = useState({ username: '', old_password: '', new_password: '', confirm: '' })

    const register = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            await api.post(`/api/register`, params)
            setLocalView('login')/*
            await trailerApi.register(form.username, form.password)
            setLocalView('login')*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
            console.log(error)
        }
    }

    const login = async () => {
        try {
            const params = {
                username: form.username,
                password: form.password
            }
            const res = await api.post(`/api/login`, params)
            setUser({
                email: res.data.user.username,
                role: res.data.user.role
            })
            console.log(user)
            /*
            const res = await trailerApi.login(form.username, form.password)
            setUser({
                email: res.user.email,
                id: res.user.id,
                accessToken: res.accessToken,
                refreshToken: res.refreshToken,
                role: res.user.role
            })*/
        } catch(error: unknown) {
            let message = 'Something went wrong during login'
            if (axios.isAxiosError(error)) {
                message = 
                    error.response?.data?.message || 
                    error.response?.data ||
                    error.message
            } else if (error instanceof Error) {
                message = error.message
            }

            setError(message)
            setIsError(true)
            console.log(error)
        }
    }

    const handleResetChange = ({ target: { id, value } }: any) =>
        setResetForm(prev => ({ ...prev, [id]: value }))

    const handleChangeChange = ({ target: { id, value } }: any) =>
        setChangeForm(prev => ({ ...prev, [id]: value }))

    const resetPassword = async () => {
        setIsError(false)
        setSuccessMsg('')
        if (resetForm.new_password !== resetForm.confirm) {
            setError('Passwords do not match'); setIsError(true); return
        }
        try {
            await api.post('/api/reset_password', {
                username:     resetForm.username,
                token:        resetForm.token,
                new_password: resetForm.new_password,
            })
            setSuccessMsg('Password reset. You can now log in.')
            setResetForm({ username: '', token: '', new_password: '', confirm: '' })
            setLocalView('login')
        } catch (error: unknown) {
            let message = 'Reset failed'
            if (axios.isAxiosError(error)) message = error.response?.data || error.message
            setError(message); setIsError(true)
        }
    }

    const changePassword = async () => {
        setIsError(false)
        setSuccessMsg('')
        if (changeForm.new_password !== changeForm.confirm) {
            setError('Passwords do not match'); setIsError(true); return
        }
        try {
            await api.post('/api/change_password', {
                username:     changeForm.username,
                old_password: changeForm.old_password,
                new_password: changeForm.new_password,
            })
            setSuccessMsg('Password changed successfully.')
            setChangeForm({ username: '', old_password: '', new_password: '', confirm: '' })
            setLocalView('login')
        } catch (error: unknown) {
            let message = 'Change failed'
            if (axios.isAxiosError(error)) message = error.response?.data || error.message
            setError(message); setIsError(true)
        }
    }

    const accept = () => {
        setShowMessage(prev => !prev)
        setAccepted(prev => !prev)
    }

    const message = () => {
        setShowMessage(prev => !prev)
    }

    const renderRegistration = () => {
        return(
            <Box className='container'>
                <h1>Register</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                    {
                            showMessage ? privacyStatement() : <></>
                    }
                    <div style={{
                    display: 'flex',
                    width: '30%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5%',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                    }}>
                        {
                            showMessage && !accepted ?
                            <Button variant='contained' color='success' onClick={() => accept()}>I Accept</Button>
                            : !showMessage && accepted ?
                            <Button variant='contained' color='success' onClick={() => register()}>Register</Button>
                            :
                            <Button variant='contained' color='success' onClick={() => message()}>Privacy Agreement</Button>
                        }
                        <Button variant='contained' color='error' onClick={() => setLocalView('login')}>Back To Login</Button>
                    </div>
            </Box>
        )
    }

    const renderLogin = () => {
        return(
            <Box className='container' onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') login() }}>
                <h1>Login</h1>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Username</InputLabel>
                    <Input
                    id='username'
                    type='text'
                    value={form.username}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                    <InputLabel htmlFor="door">Password</InputLabel>
                    <Input
                    id='password'
                    type='password'
                    value={form.password}
                    onChange={handleChange}
                    placeholder='149'
                    />
                </FormControl>
                <div style={{
                    display: 'flex',
                    width: '30%',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '5%',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    textAlign: 'center'
                }}>
                    <Button variant='contained' color='success' onClick={() => login()}>Login</Button>
                    <Button variant='contained' color='error' onClick={() => setLocalView('register')}>Register</Button>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                    <span
                        onClick={() => { setIsError(false); setLocalView('reset') }}
                        style={{ color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Password Reset
                    </span>
                    <span
                        onClick={() => { setIsError(false); setLocalView('change') }}
                        style={{ color: '#aaa', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        Change Password
                    </span>
                </div>
                {isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>}
            </Box>
        )
    }

    const renderReset = () => (
        <Box className='container' onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') resetPassword() }}>
            <h1>Reset Password</h1>
            <p style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: 8 }}>
                Enter the token your administrator provided.
            </p>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="username">Username</InputLabel>
                <Input id='username' type='text' value={resetForm.username} onChange={handleResetChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="token">Reset Token</InputLabel>
                <Input id='token' type='text' value={resetForm.token} onChange={handleResetChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="new_password">New Password</InputLabel>
                <Input id='new_password' type='password' value={resetForm.new_password} onChange={handleResetChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="confirm">Confirm Password</InputLabel>
                <Input id='confirm' type='password' value={resetForm.confirm} onChange={handleResetChange} />
            </FormControl>
            <div style={{ display: 'flex', width: '30%', gap: 12, marginTop: '5%', marginLeft: 'auto', marginRight: 'auto' }}>
                <Button variant='contained' color='success' onClick={resetPassword}>Reset</Button>
                <Button variant='contained' color='error' onClick={() => { setIsError(false); setLocalView('login') }}>Back</Button>
            </div>
            {isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>}
        </Box>
    )

    const renderChange = () => (
        <Box className='container' onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') changePassword() }}>
            <h1>Change Password</h1>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="username">Username</InputLabel>
                <Input id='username' type='text' value={changeForm.username} onChange={handleChangeChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="old_password">Current Password</InputLabel>
                <Input id='old_password' type='password' value={changeForm.old_password} onChange={handleChangeChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="new_password">New Password</InputLabel>
                <Input id='new_password' type='password' value={changeForm.new_password} onChange={handleChangeChange} />
            </FormControl>
            <FormControl sx={{ m: 1, width: '25ch' }} variant="standard">
                <InputLabel htmlFor="confirm">Confirm Password</InputLabel>
                <Input id='confirm' type='password' value={changeForm.confirm} onChange={handleChangeChange} />
            </FormControl>
            <div style={{ display: 'flex', width: '30%', gap: 12, marginTop: '5%', marginLeft: 'auto', marginRight: 'auto' }}>
                <Button variant='contained' color='success' onClick={changePassword}>Change</Button>
                <Button variant='contained' color='error' onClick={() => { setIsError(false); setLocalView('login') }}>Back</Button>
            </div>
            {isError && <p style={{ color: 'red', marginTop: '5%' }}>{error}</p>}
        </Box>
    )

    const privacyStatement = () => {
        return (
            <div style={{
                marginTop: '5%',
                padding: '2%',
                marginBottom: '5%',
            }}>
                <p><strong>Personal Information Collection Notice</strong></p>
                <br />
                <p>
                    When you register for MODMS, GM collects and processes the personal information you provide 
                    to create and manage your account, authenticate your access, provide and support the service, 
                    communicate with you about your account, maintain security, and meet legal, regulatory, 
                    and operational requirements.
                </p>
                <br />
                <p>
                    The personal information collected during registration may include your name, email address, 
                    username, password or other authentication credentials, company or organization name, job 
                    title or role, contact information, and any other information you choose to provide as part 
                    of the registration or profile setup process.
                </p>
                <br />
                <p>
                    We use this information only for legitimate business purposes related to operating and improving 
                    the service, administering user access, responding to support requests, protecting the security 
                    and integrity of the platform, and complying with applicable law, company policy, or contractual
                    obligations.
                </p>
                <br />
                <p>
                    Your personal information may be shared with affiliates, service providers, and other authorized 
                    parties that support the operation of the service or help us meet legal, security, audit, or 
                    compliance obligations. We may also disclose information where required by law or where necessary 
                    to protect our rights, users, systems, or business operations.
                </p>
                <br />
                <p>
                    We retain personal information only for as long as needed to fulfill the purposes described above, 
                    including account administration, legal, regulatory, audit, security, and recordkeeping requirements.
                </p>
                <br />
                <p>
                    We take reasonable and appropriate steps to protect personal information against unauthorized access, 
                    use, disclosure, alteration, or destruction. However, no system can be guaranteed to be completely secure.
                </p>
                <br />
                <p>
                    Depending on your location and applicable law, you may have rights regarding your personal information, 
                    such as the right to request access, correction, deletion, or additional information about how your 
                    information is processed.
                </p>
                <br />
                <p>
                    If you have questions about this notice or how your personal information is handled, please contact
                    aaron.ely@gm.com
                </p>
                <br />
                <p>
                    By selecting Register, Create Account, or continuing with registration, you acknowledge that you have 
                    read and understood this Personal Information Collection Notice.
                </p>
            </div>
        )
    }


    return(
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            {successMsg && <p style={{ color: 'green', marginBottom: 12 }}>{successMsg}</p>}
            {localView === 'register' ? renderRegistration()
             : localView === 'reset'  ? renderReset()
             : localView === 'change' ? renderChange()
             : renderLogin()}
        </div>
    )
}

export default Login